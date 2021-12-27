import { Pathfinding } from 'three-pathfinding';
declare var AFRAME;

const ZONE = 'mobius';
const THREE = AFRAME.THREE;

/**
 * nav
 *
 * Pathfinding system, using PatrolJS.
 */
export const navSystem = {
  init: function () {
    this.navMesh = null;
    this.agents = new Set();
    this.pathfinder = null;
  },

  /**
   * @param {THREE.Geometry} geometry
   */
  setNavMeshGeometry: function (geometry) {
    this.navMesh = new THREE.Mesh(geometry);
    const newZone = Pathfinding.createZone(geometry);
    this.pathfinder = new Pathfinding();
    this.pathfinder.setZoneData(ZONE, newZone);
    Array.from(this.agents).forEach((agent) => (<any>agent).updateNavLocation());
  },

  /**
   * @return {THREE.Mesh}
   */
  getNavMesh: function () {
    return this.navMesh;
  },

  /**
   * @param {NavAgent} ctrl
   */
  addAgent: function (ctrl) {
    this.agents.add(ctrl);
  },

  /**
   * @param {NavAgent} ctrl
   */
  removeAgent: function (ctrl) {
    this.agents.delete(ctrl);
  },

  /**
   * @param  {THREE.Vector3} start
   * @param  {THREE.Vector3} end
   * @param  {number} groupID
   * @return {Array<THREE.Vector3>}
   */
  getPath: function (start, end, groupID) {
    return this.navMesh
      ? this.pathfinder.findPath(start, end, ZONE, groupID)
      : null;
  },

  /**
   * @param {THREE.Vector3} position
   * @return {number}
   */
  getGroup: function (position) {
    // return '0';
    return this.navMesh
      ? this.pathfinder.getGroup(ZONE, position)
      : null;
  },

  /**
   * @param  {THREE.Vector3} position
   * @param  {number} groupID
   * @return {Node}
   */
  getNode: function (position, groupID) {
    return this.navMesh
        ? this.pathfinder.getClosestNode(position, ZONE, groupID, false)
        : null;
  },

  /**
   * @param  {THREE.Vector3} start Starting position.
   * @param  {THREE.Vector3} end Desired ending position.
   * @param  {number} groupID
   * @param  {Node} node
   * @param  {THREE.Vector3} endTarget (Output) Adjusted step end position.
   * @return {Node} Current node, after step is taken.
   */
  clampStep: function (start, end, groupID, node, endTarget) {
    if (!this.navMesh) {
      endTarget.copy(end);
      return null;
    } else if (!node) {
      endTarget.copy(end);
      return this.getNode(end, groupID);
    }
    return this.pathfinder.clampStep(start, end, node, ZONE, groupID, endTarget);
  }
};
