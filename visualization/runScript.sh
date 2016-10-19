node ../http-server/bin/http-server
browserify -t brfs interpretMotionData.js > renderBundle.js
open visualize.html
