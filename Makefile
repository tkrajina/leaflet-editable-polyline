GIT_PORCELAIN_STATUS=$(shell git status --porcelain)
VERSION=$(shell head -1 VERSION)

build: clean prepare-examples
	mkdir dist
	yui-compressor src/leaflet-editable-polyline.js > "dist/leaflet-editable-polyline-$(VERSION).js"
clean:
	rm -Rf dist
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
github-pages: check-all-commited prepare-examples
	git branch -D gh-pages
	git checkout -b gh-pages
	rm .gitignore
	mv examples/* .
	git add .
	git commit -m "gh-pages"
	git checkout master
check-all-commited:
	if [ -n "$(GIT_PORCELAIN_STATUS)" ]; \
	then \
	    echo 'YOU HAVE UNCOMMITED CHANGES'; \
	    git status; \
	    exit 1; \
	fi
