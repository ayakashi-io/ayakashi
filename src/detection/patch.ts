import brokenImage from "./patches/brokenImage";
import chrome from "./patches/chrome";
import hairline from "./patches/hairline";
import language from "./patches/language";
import permissions from "./patches/permissions";
import plugins from "./patches/plugins";
import webdriver from "./patches/webdriver";
import WebGLRenderingContext from "./patches/WebGLRenderingContext";

//patches based on https://intoli.com/blog/not-possible-to-block-chrome-headless/
brokenImage();
chrome();
hairline();
language();
permissions();
plugins();
webdriver();
WebGLRenderingContext();
