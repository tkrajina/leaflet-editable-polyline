L.Polyline.polylineEditor = L.Polyline.extend({
    /**
     * This function must be explicitly called when the polyline is ready to 
     * be edited. 
     *
     * If contexts is not null then this is just a shortcut for the contexts 
     * method.
     */
    edit: function(options, contexts) {
        if(!this._map) {
            alert('Not added to map!');
            return;
        }

        this._initialized = false;

        /**
         * Since all point editing is done by marker events, markers 
         * will be the main holder of the polyline points locations.
         * Every marker contains a reference to the newPointMarker 
         * *before* him (=> the first marker has newPointMarker=null).
         */
        this._parseOptions(options);

        this._markers = [];
        var that = this;
        var points = this.getLatLngs();
        var length = points.length;
        for(var i = 0; i < length; i++) {
            this._addMarkers(i, points[i]);
        }

        var map = this._map;
        this._map.on("zoomend", function(e) {
            console.log("zoom level is " + map.getZoom())
            that._showBoundMarkers();
        });
        this._map.on("moveend", function(e) {
            console.log("zoom level is " + map.getZoom())
            that._showBoundMarkers();
        });

        this.contexts(contexts);

        this._initialized = true;

        return this;
    },
    /**
     * This is an array of objects that will be kept as "context" for every 
     * point. Marker will keep this value as marker.context. New markers will 
     * have context set to null.
     *
     * Contexts must be the same size as the polyline size!
     *
     * By default, even without calling this method -- every marker will have 
     * context with one value: marker.context.originalPointNo with the 
     * original order number of this point. The order may change if some 
     * markers before this one are delted or new added.
     */
    contexts: function(contexts) {
        if(contexts != null && contexts.length != this._markers.length)
            throw new Exception('Invalid contexts size (' + contexts.length + '), should be:' + this._markers.length);

        for(var i = 0; i < this._markers.length; i++) {
            this._addMarkerContextIfNeeded(this._markers[i], i, contexts == null ? null : contexts[i]);

        return this;
        }
    },
    /** 
     * Prepare marker context.
     * 
     * pointNo will be ignored if the original polyline was initialized (ie 
     * this._initialized if true).
     */
    _addMarkerContextIfNeeded: function(marker, pointNo, data) {
        // If we are still initializing the polyline, this is a original 
        // point, otherwise it is added by the user later:
        if(!marker.context)
            marker.context = {};

        if(!this._initialized)
            marker.context.originalPointNo = pointNo;

        if(data != null) {
            for(var j in data) { // Copy user-defined context properties to marker context:
                marker.context[j] = data[j];
            }
        }

    },
    /**
     * Get markers for this polyline.
     */
    getPoints: function() {
        return this._markers;
    },
    _parseOptions: function(options) {
        if(!options)
            options = {};

        // Do not show edit markers if more than maxMarkers would be shown:
        if(!('maxMarkers' in options)) {
            options.maxMarkers = 100;
        }
        this.maxMarkers = options.maxMarkers;
        console.log("maxMarkers=" + this.maxMarkers);

        // Icons:
        if(options.pointIcon) {
            this.pointIcon = options.pointIcon;
        } else {
            this.pointIcon = L.icon({ iconUrl: 'editmarker.png', iconSize: [11, 11], iconAnchor: [6, 6], });
        }
        if(options.newPointIcon) {
            this.newPointIcon = options.newPointIcon;
        } else {
            this.newPointIcon = L.icon({ iconUrl: 'editmarker2.png', iconSize: [11, 11], iconAnchor: [6, 6], });
        }
    },
    /**
     * Show only markers in current map bounds *is* there are only a certain 
     * number of markers. This method is called on eventy that change map 
     * bounds.
     */
    _showBoundMarkers: function() {
        var that = this;
        var bounds = this._map.getBounds();
        var found = 0;
        for(var markerNo in this._markers) {
            var marker = this._markers[markerNo];
            //console.log('marker=', marker);
            if(bounds.contains(marker.getLatLng()))
                found += 1;
        }

        console.log("found=" + found);
        for(var markerNo in this._markers) {
            var marker = this._markers[markerNo];
            if(found < that.maxMarkers) {
                that._setMarkerVisible(marker, bounds.contains(marker.getLatLng()));
                if(marker.newPointMarker)
                    that._setMarkerVisible(marker.newPointMarker, bounds.contains(marker.getLatLng()));
            } else {
                that._setMarkerVisible(marker, false);
                if(marker.newPointMarker)
                    that._setMarkerVisible(marker.newPointMarker, false);
            }
        }
    },
    /**
     * Show/hide marker.
     */
    _setMarkerVisible: function(marker, show) {
        if(!marker)
            return;

        var map = this._map;
        if(show) {
            if(!marker._map) { // First show fo this marker:
                marker.addTo(map);
            } else { // Marker was already shown and hidden:
                map.addLayer(marker);
            }
            marker._visible = true;
            marker._map = map;
        } else {
            map.removeLayer(marker);
            marker._visible = false;
        }
    },
    /**
     * Add two markers (a point marker and his newPointMarker) for a 
     * single point.
     *
     * Markers are not added on the map here, the marker.addTo(map) is called 
     * only later when needed first time because of performance issues.
     */
    _addMarkers: function(pointNo, latLng, fixNeighbourPositions) {
        var that = this;
        var points = this.getLatLngs();
        var marker = L.marker(latLng, {draggable: true, icon: this.pointIcon});

        marker.newPointMarker = null;
        marker.on('dragstart', function(event) {
            // Busy!
            console.log('Drag start');
        });
        marker.on('dragend', function(event) {
            var marker = event.target;
            var pointNo = that._getPointNo(event.target);
            that.setLatLngs(that._getMarkerLatLngs());
            that._fixNeighbourPositions(pointNo);
            that._showBoundMarkers();
        });
        marker.on('contextmenu', function(event) {
            console.log('rightclick to remove point!');
        });
        marker.on('click', function(event) {
            var marker = event.target;
            var pointNo = that._getPointNo(event.target);
            if(pointNo == 0 || pointNo == that._markers.length - 1) {
                console.log('Click on first or last, add new point');
            }
        });

        if(pointNo > 0) {
            var previousPoint = points[pointNo - 1];
            var newPointMarker = L.marker([(latLng.lat + previousPoint.lat) / 2.,
                                           (latLng.lng + previousPoint.lng) / 2.],
                                          {draggable: true, icon: this.newPointIcon});
            marker.newPointMarker = newPointMarker;
            newPointMarker.on('dragstart', function(event) {
                // Busy!
                console.log('Drag start');
            });
            newPointMarker.on('dragend', function(event) {
                var marker = event.target;
                var pointNo = that._getPointNo(event.target);
                that._addMarkers(pointNo, marker.getLatLng(), true);
                that.setLatLngs(that._getMarkerLatLngs());
                that._showBoundMarkers();
            });
        }

        this._markers.splice(pointNo, 0, marker);
        this._addMarkerContextIfNeeded(marker, pointNo);

        if(fixNeighbourPositions) {
            this._fixNeighbourPositions(pointNo);
        }
    },
    /**
     * Fix nearby new point markers when the new point is created.
     */
    _fixNeighbourPositions: function(pointNo) {
        var previousMarker = pointNo == 0 ? null : this._markers[pointNo - 1];
        var marker = this._markers[pointNo];
        var nextMarker = pointNo < this._markers.length - 1 ? this._markers[pointNo + 1] : null;
        if(marker && previousMarker) {
            marker.newPointMarker.setLatLng([(previousMarker.getLatLng().lat + marker.getLatLng().lat) / 2.,
                                             (previousMarker.getLatLng().lng + marker.getLatLng().lng) / 2.]);
        }
        if(marker && nextMarker) {
            nextMarker.newPointMarker.setLatLng([(marker.getLatLng().lat + nextMarker.getLatLng().lat) / 2.,
                                                 (marker.getLatLng().lng + nextMarker.getLatLng().lng) / 2.]);
        }
    },
    _getPointNo: function(marker) {
        for(var i = 0; i < this._markers.length; i++) {
            if(marker == this._markers[i] || marker == this._markers[i].newPointMarker) {
                console.log("Found:" + i);
                return i;
            }
        }
        console.log("Nothing found for:" + marker);
        return -1;
    },
    /**
     * Get polyline latLngs based on marker positions.
     */
    _getMarkerLatLngs: function() {
        var result = [];
        for(var i = 0; i < this._markers.length; i++)
            result.push(this._markers[i].getLatLng());
        return result;
    },
});

L.Polyline.polylineEditor.addInitHook(function () {
    //this._initMarkers();
});

L.Polyline.PolylineEditor = function(latlngs, options){
    return new L.Polyline.polylineEditor(latlngs, options);
};

