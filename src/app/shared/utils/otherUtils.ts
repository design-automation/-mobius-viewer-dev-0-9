export function updateLocalViewerSettings(settings: any): boolean {
    if (!settings) { return false; }
    let settings_string;
    if (typeof settings === 'string') {
        settings = JSON.parse(settings);
    }
    if (settings.geo) {
        delete settings['geo'];
    }
    settings_string = JSON.stringify(settings);
    if (settings_string === '{}') { return false; }
    const local_settings = JSON.parse(localStorage.getItem('mpm_settings'));

    if (settings === null) {
        return false;
    } else {
        propCheck(settings, local_settings);
        localStorage.setItem('mpm_settings', JSON.stringify(settings));
        if (settings.camera) {
            // console.log(JSON.stringify(settings.camera))
            localStorage.setItem('gi_camera', JSON.stringify(settings.camera));
        }
    }
    return true;
}

export function updateGeoViewerSettings(settings: any): boolean {
    if (!settings) { return false; }
    let settings_string;
    if (typeof settings === 'string') {
        settings = JSON.parse(settings);
    }
    if (!settings || !settings.geo) {
        return false;
    }
    settings = settings.geo;
    settings_string = JSON.stringify(settings);
    if (settings_string === '{}') { return false; }
    const local_settings = JSON.parse(localStorage.getItem('geo_settings'));

    if (settings === null) {
        return false;
    } else {
        propCheck(settings, local_settings);
        settings.updated = true;
        localStorage.setItem('geo_settings', JSON.stringify(settings));
    }
    return true;
}

export function updateAframeViewerSettings(settings: any): boolean {
    if (!settings) { return false; }
    let settings_string;
    if (typeof settings === 'string') {
        settings = JSON.parse(settings);
    }
    if (!settings || !settings.aframe) {
        return false;
    }
    settings = settings.aframe;
    settings_string = JSON.stringify(settings);
    if (settings_string === '{}') { return false; }
    const local_settings = JSON.parse(localStorage.getItem('aframe_settings'));

    if (settings === null) {
        return false;
    } else {
        propCheck(settings, local_settings);
        settings.updated = true;
        localStorage.setItem('aframe_settings', JSON.stringify(settings));
    }
    return true;
}

function propCheck(obj1, obj2, checkChildren = true) {
    for (const i in obj2) {
        if (!obj1.hasOwnProperty(i)) {
            obj1[i] = JSON.parse(JSON.stringify(obj2[i]));
        } else if (checkChildren && obj1[i].constructor === {}.constructor && obj2[i].constructor === {}.constructor) {
            propCheck(obj1[i], obj2[i], false);
        }
    }
}

export function processDownloadURL(inpURL) {
    let url = inpURL.replace('http://', 'https://');
    if (url.indexOf('dropbox') !== -1) {
        url = url.replace('www', 'dl').replace('dl=0', 'dl=1');
    }
    if (url[0] === '"' || url[0] === '\'') {
        url = url.substring(1);
    }
    if (url[url.length - 1] === '"' || url[url.length - 1] === '\'') {
        url = url.substring(0, url.length - 1);
    }
    return url;
}

