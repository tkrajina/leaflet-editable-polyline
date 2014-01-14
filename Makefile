get-leaflet-dist:
	# Will retrieve leaflet files if needed:
	test -f leaflet.css || wget http://leafletjs.com/dist/leaflet.css
	test -f leaflet.js || wget http://leafletjs.com/dist/leaflet.js
show-chromium: get-leaflet-dist
	chromium-browser index.html
show-firefox: get-leaflet-dist
	firefox index.html
