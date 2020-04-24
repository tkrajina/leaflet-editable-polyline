GIT_PORCELAIN_STATUS=$(shell git status --porcelain)
VERSION=$(shell head -1 VERSION)
LEAFLET_VERSION=1.6.0

build: clean
	mkdir dist
	yui-compressor src/leaflet-editable-polyline.js > "dist/leaflet-editable-polyline-$(VERSION).js"
clean:
	rm -Rf dist
get-leaflet-dist:
	# Will retrieve leaflet files if needed:
	wget https://unpkg.com/leaflet@$(LEAFLET_VERSION)/dist/leaflet.css -O examples/leaflet.css
	wget https://unpkg.com/leaflet@$(LEAFLET_VERSION)/dist/leaflet.js -O examples/leaflet.js
open-examples: get-leaflet-dist
	open examples/index.html
show-firefox: get-leaflet-dist
	firefox examples/index.html
github-pages: check-all-commited
	git branch -D gh-pages
	git checkout -b gh-pages
	rm .gitignore
	cp examples/* .
	git add .
	git commit -m "gh-pages"
	git checkout master
	git clean -f
	git checkout -- .
check-all-commited:
	if [ -n "$(GIT_PORCELAIN_STATUS)" ]; \
	then \
	    echo 'YOU HAVE UNCOMMITED CHANGES'; \
	    git status; \
	    exit 1; \
	fi
