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

        this._addMethods();

        /**
         * When addint a new point we must disable the user to mess with other 
         * markers. One way is to check everywhere if the user is busy. The 
         * other is to just remove other markers when the user is doing 
         * somethinng.
         *
         * TODO: Decide the right way to do this and then leave only _busy or 
         * _hideAll().
         */
        this._busy = false;
        this._initialized = false;

        this._init(options, contexts);

        this._initialized = true;

        return this;
    },
    /**
     * Will add all needed methods to this polyline.
     */
    _addMethods: function() {
        var that = this;

        this._init = function(options, contexts) {
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
                that._showBoundMarkers();
            });
            this._map.on("moveend", function(e) {
                that._showBoundMarkers();
            });

            this.contexts(contexts);

            // Container for all editable polylines on this map:
            if(!('_editablePolylines' in this._map))
                this._map._editablePolylines = [];
            this._map._editablePolylines.push(this);
        };

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
        this.contexts = function(contexts) {
            if(contexts != null && contexts.length != this._markers.length)
                throw new Exception('Invalid contexts size (' + contexts.length + '), should be:' + this._markers.length);

            for(var i = 0; i < this._markers.length; i++) {
                this._addMarkerContextIfNeeded(this._markers[i], i, contexts == null ? null : contexts[i]);

            return this;
            }
        };

        /** 
         * Prepare marker context.
         * 
         * pointNo will be ignored if the original polyline was initialized (ie 
         * this._initialized if true).
         */
        this._addMarkerContextIfNeeded = function(marker, pointNo, data) {
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
        };

        /**
         * Check if there is *any* busy editable polyline on this map.
         */
        this.isBusy = function() {
            for(var i = 0; i < that._map._editablePolylines.length; i++)
                if(that._map._editablePolylines[i]._isBusy())
                    return true;

            return false;
        };

        /**
         * Check if is busy adding/moving new nodes. Note, there may be 
         * *other* editable polylines on the same map which *are* busy.
         */
        this._isBusy = function() {
            return that._busy;
        };

        this._setBusy = function(busy) {
            that._busy = busy;
        };

        /**
         * Get markers for this polyline.
         */
        this.getPoints = function() {
            return this._markers;
        };

        this._parseOptions = function(options) {
            if(!options)
                options = {};

            // Do not show edit markers if more than maxMarkers would be shown:
            if(!('maxMarkers' in options)) {
                options.maxMarkers = 100;
            }
            this.maxMarkers = options.maxMarkers;

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
        };

        /**
         * Show only markers in current map bounds *is* there are only a certain 
         * number of markers. This method is called on eventy that change map 
         * bounds.
         */
        this._showBoundMarkers = function() {
            var that = this;
            var bounds = this._map.getBounds();
            var found = 0;
            for(var markerNo in this._markers) {
                var marker = this._markers[markerNo];
                if(bounds.contains(marker.getLatLng()))
                    found += 1;
            }

            for(var markerNo in this._markers) {
                var marker = this._markers[markerNo];
                if(found < that.maxMarkers) {
                    that._setMarkerVisible(marker, bounds.contains(marker.getLatLng()));
                    that._setMarkerVisible(marker.newPointMarker, markerNo > 0 && bounds.contains(marker.getLatLng()));
                } else {
                    that._setMarkerVisible(marker, false);
                    that._setMarkerVisible(marker.newPointMarker, false);
                }
            }
        };

        /**
         * Used when adding/moving points in order to disable the user to mess 
         * with other markers (+ easier to decide where to put the point 
         * without too many markers).
         */
        this._hideAll = function(except) {
            for(var markerNo in this._markers) {
                var marker = this._markers[markerNo];
                if(except == null || except != marker)
                    that._setMarkerVisible(marker, false);
                if(except == null || except != marker.newPointMarker)
                    that._setMarkerVisible(marker.newPointMarker, false);
            }
        }

        /**
         * Show/hide marker.
         */
        this._setMarkerVisible = function(marker, show) {
            if(!marker)
                return;

            var map = this._map;
            if(show) {
                if(!marker._visible) {
                    if(!marker._map) { // First show fo this marker:
                        marker.addTo(map);
                    } else { // Marker was already shown and hidden:
                        map.addLayer(marker);
                    }
                    marker._map = map;
                }
                marker._visible = true;
            } else {
                if(marker._visible) {
                    map.removeLayer(marker);
                }
                marker._visible = false;
            }
        };

        this._reloadPolyline = function(fixAroundPointNo) {
            that.setLatLngs(that._getMarkerLatLngs());
            if(fixAroundPointNo != null)
                that._fixNeighbourPositions(fixAroundPointNo);
            that._showBoundMarkers();
        }

        /**
         * Add two markers (a point marker and his newPointMarker) for a 
         * single point.
         *
         * Markers are not added on the map here, the marker.addTo(map) is called 
         * only later when needed first time because of performance issues.
         */
        this._addMarkers = function(pointNo, latLng, fixNeighbourPositions) {
            var that = this;
            var points = this.getLatLngs();
            var marker = L.marker(latLng, {draggable: true, icon: this.pointIcon});

            marker.newPointMarker = null;
            marker.on('dragstart', function(event) {
                that._setBusy(true);
                that._hideAll(marker);
            });
            marker.on('dragend', function(event) {
                var marker = event.target;
                var pointNo = that._getPointNo(event.target);
                that._reloadPolyline(pointNo);
                that._setBusy(false);
            });
            marker.on('contextmenu', function(event) {
                var marker = event.target;
                var pointNo = that._getPointNo(event.target);
                that._map.removeLayer(marker);
                that._map.removeLayer(newPointMarker);
                that._markers.splice(pointNo, 1);
                that._reloadPolyline(pointNo);
            });
            marker.on('click', function(event) {
                var marker = event.target;
                var pointNo = that._getPointNo(event.target);
                if(pointNo == 0 || pointNo == that._markers.length - 1) {
                    that._prepareForNewPoint(marker, pointNo == 0 ? 0 : pointNo + 1);
                }
            });

            var previousPoint = points[pointNo == 0 ? pointNo : pointNo - 1];
            var newPointMarker = L.marker([(latLng.lat + previousPoint.lat) / 2.,
                                           (latLng.lng + previousPoint.lng) / 2.],
                                          {draggable: true, icon: this.newPointIcon});
            marker.newPointMarker = newPointMarker;
            newPointMarker.on('dragstart', function(event) {
                that._setBusy(true);
                that._hideAll(marker.newPointMarker);
            });
            newPointMarker.on('dragend', function(event) {
                var marker = event.target;
                var pointNo = that._getPointNo(event.target);
                that._addMarkers(pointNo, marker.getLatLng(), true);
                that._reloadPolyline();
                that._setBusy(false);
            });
            newPointMarker.on('contextmenu', function(event) {
                console.log('TODO: split');
                // 1. Remove this polyline from map
                var marker = event.target;
                var markers = that.getPoints();
                that._hideAll();

                var secondPartMarkers = that._markers.slice(0, pointNo);
                that._markers.splice(pointNo, that._markers.length - pointNo);

                that._reloadPolyline();
                /*
                var pointNo = that._getPointNo(marker);
                that._hideAll();
                var polylineIndex = that._map._editablePolylines.indexOf(that);
                var newPolyline = L.Polyline.PolylineEditor(markers.slice(pointNo, markers.length))
                                        .addTo(map)
                                        .edit({maxMarkers: 100});
                if(position >= 0) {
                    this._map._editablePolylines.splice(polylineIndex, 1);
                }
                // 2. Create two new polylines with existing contexts
                // 3. Add polylines to this._map
                that._map.removeLayer(that);
                */
                console.log('Done split')
            });

            this._markers.splice(pointNo, 0, marker);
            this._addMarkerContextIfNeeded(marker, pointNo);

            if(fixNeighbourPositions) {
                this._fixNeighbourPositions(pointNo);
            }
        };

        /**
         * Event handlers for first and last point.
         */
        this._prepareForNewPoint = function(marker, pointNo) {
            that._hideAll();
            var tmpLine = L.polyline([marker.getLatLng(), marker.getLatLng()]).addTo(that._map);
            var mouseMoveHandler = function(event) {
                tmpLine.setLatLngs([marker.getLatLng(), event.latlng]);
                that._setBusy(true);
            };
            that._map.on('mousemove', mouseMoveHandler);
            that._map.once('click', function(event) {
                that._map.off('mousemove', mouseMoveHandler);
                that._map.removeLayer(tmpLine);
                that._addMarkers(pointNo, event.latlng, true);
                that._reloadPolyline();
                that._setBusy(false);
            });
        };

        /**
         * Fix nearby new point markers when the new point is created.
         */
        this._fixNeighbourPositions = function(pointNo) {
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
        };

        /**
         * Find the order number of the marker.
         */
        this._getPointNo = function(marker) {
            for(var i = 0; i < this._markers.length; i++) {
                if(marker == this._markers[i] || marker == this._markers[i].newPointMarker) {
                    return i;
                }
            }
            return -1;
        };

        /**
         * Get polyline latLngs based on marker positions.
         */
        this._getMarkerLatLngs = function() {
            var result = [];
            for(var i = 0; i < this._markers.length; i++)
                result.push(this._markers[i].getLatLng());
            return result;
        };
    }
});

L.Polyline.polylineEditor.addInitHook(function () {
    //this._initMarkers();
});

L.Polyline.PolylineEditor = function(latlngs, options){
    return new L.Polyline.polylineEditor(latlngs, options);
};

