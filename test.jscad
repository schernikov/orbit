function main() {
    var r = 6.378;
    var orb = r+35.786;
    var mnorb = r+384.0
    var mr = 1.7375
    var path = CSG.Path2D.arc({
                    radius: orb, 
		    center: [0, 0, 0],
		    startangle: 0,
                    endangle: 360,
                    resolution: 50});
    return [sphere({r:r,
                   fn: 100,
                   type: 'geodesic'}), 
            sphere({r:mr,
                   fn: 30,
                   type: 'geodesic'}).translate([mnorb, 0, 0]),
	    cube({size: 1}).translate([orb, 0, 0]),
	    path.expandToCAG(.1, 50)
           ];
}
