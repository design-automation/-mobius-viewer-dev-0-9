console.log('running mod3js.js')
try {
    var fs = require('fs')
    fs.readFile('./node_modules/itowns/lib/core/view.js', 'utf8', function (err,data) {
        if (err) {
            return console.log(err);
        }
        var result = data.replace(
            "this._fullSizeDepthBuffer = new Uint8Array(4 * width * height);", 
            `if (width === 0 || height === 0) { return; }
            this._fullSizeDepthBuffer = new Uint8Array(4 * width * height);`);
        fs.writeFile('./node_modules/itowns/lib/core/view.js', result, 'utf8', function (err) {
            if (err) return console.log(err);
        });
    });
    
} catch (ex) {
    console.log('Error:', ex)
}

// try {
//     var fs = require('fs')
//     fs.readFile('./node_modules/three/build/three.module.js', 'utf8', function (err,data) {
//         if (err) {
//             return console.log(err);
//         }
//         var result = data.replace("rendererExtensionFragDepth: isWebGL2", 'rendererExtensionFragDepth: false, // isWebGL2');
//         fs.writeFile('./node_modules/three/build/three.module.js', result, 'utf8', function (err) {
//             if (err) return console.log(err);
//         });
//     });
    
// } catch (ex) {
//     console.log('Error:', ex)
// }
