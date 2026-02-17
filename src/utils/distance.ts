// Haversine formula. 
/**
 *  distance = sqrt((x2-x1)^2 + (y2-y1)^2)
That works on flat surfaces.But Earth is curved not flat. So we need spherical distance math.

Given: Point A (lat1, lng1) ; Point B (lat2, lng2)
We:
Convert degrees to radians, Compute angular difference, 
Use trigonometry to compute arc distance Multiply by Earth's radius, 
Final result = distance in kilometers

Degrees → radians: radians = degrees × (π / 180)

1 degree = (pi / 180) radians

When you have a difference in latitude (like lat2 - lat1), you have a value in degrees. 
To convert any number of degrees (D) into radians (R), 
you multiply by the value of a single degree:R = D * {pi} / {180}

a =  calculates the square of half the chord length between two points on a sphere.
We use sin(dLat / 2) and sin(dLng / 2) to calculate this "internal" distance through the sphere.

c = the code converts that straight "chord" distance back into a curved angle

Distance = Radius × Angle
 * 
 */

export const calculateDistanceKm = (lat1: number,lng1: number,lat2: number,lng2: number): number => {
  const R = 6371;    // Earth radius km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;  //convert degrees difference into radians. Because JavaScript trig functions (sin, cos) expect radians
  const dLng = ((lng2 - lng1) * Math.PI) / 180;  //convert degrees difference into radians.

  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
