get-leaflet-dist:
	# Will retrieve leaflet files if needed:
	test -f examples/leaflet.css || wget http://leafletjs.com/dist/leaflet.css -O examples/leaflet.css
	test -f examples/leaflet.js || wget http://leafletjs.com/dist/leaflet.js -O examples/leaflet.js
prepare-examples: get-leaflet-dist
	cp src/*.js examples/
show-chromium: prepare-examples
	chromium-browser examples/index.html
show-firefox: prepare-examples
	firefox examples/index.html
