TARGET = ../bin/passff-rewrite.xpi

all: xpi

xpi:
	mkdir -p `dirname $(TARGET)`
	rm -f $(TARGET)
	zip -r $(TARGET) main.js manifest.json icon.png modules ui _locales
