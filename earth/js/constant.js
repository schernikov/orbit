/**
 * Created by schernikov on 11/16/14.
 */

/* perspective parameters */
var persp_far = 100.0;
var persp_near = 0.1;
var persp_angle = 45;

var sun_hue = [1.0, 0.94, 0.9];
var meas_color = [1.0, 1, 1, 1];
var zmeas_color = [1.0, 0.3, 0.3, 1];
var ambient = 0.2;
var earth_rad = 6.378;
var earth_orb = 149597.87;
var sun_rad = 696.342;
var meas_rad = earth_rad*2;
var moon_rad = 1.7375;
var moon_orb = earth_rad+384.0;

var angleTicksConf = {
    radius: meas_rad,
    aspect: 0.6,
    primary: {
        count: 24,
        width: {
            relative: 0.05
        }
    },
    secondary: {
        count: 15,
        width: {
            relative: 0.3
        }
    }
};

var orbTicksConf = {
    radius: earth_orb,
    offset: earth_orb,
    range: [270 -2, 270 +2], /* degrees */
    width: {
        absolute: 2
    },
    primary: {
        aspect: 1,
        count: 365.2421897
    },
    secondary: {
        aspect: 10,
        count: 24*6
    }
};
