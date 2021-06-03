/**
 * just vector subtraction
 * @param {Array} a first vector
 * @param {Array} b second vector
 */
function subVecs(a, b) {
  return a.map(function (val, idx) {
    return val - b[idx];
  });
}

/**
 * just the magnitude of a vector
 * @param {Array} a the vector to get the magnitude of
 */
function mag(a) {
  return Math.sqrt(a.reduce(function (sum, val) {
    return sum + val * val;
  }, 0));
}

/**
 * get the distance between two vectors
 * @param {Array} vec1 first vector
 * @param {Array} vec2 second vector
 */
function get_dist(vec1, vec2) {
  return mag(subVecs(vec1, vec2));
}
