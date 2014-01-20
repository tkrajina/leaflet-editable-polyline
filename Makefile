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
github-pages: prepare-examples
	git branch -D gh-pages
	git checkout -b gh-pages
	rm .gitignore
	mv examples/* .
	add .
	git commit -m "gh-pages"
	git checkout master
