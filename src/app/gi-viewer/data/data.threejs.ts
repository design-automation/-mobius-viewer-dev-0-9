import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { DataService } from '@services';
import { ISettings } from './data.threejsSettings';

import { DataThreejsLookAt } from './data.threejsLookAt';
//@ts-ignore
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils';
import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper';
import { Model, GICommon} from '@design-automation/mobius-sim-funcs';

enum MaterialType {
    MeshBasicMaterial = 'MeshBasicMaterial',
    MeshStandardMaterial = 'MeshStandardMaterial',
    MeshLambertMaterial = 'MeshLambertMaterial',
    MeshPhongMaterial = 'MeshPhongMaterial',
    MeshPhysicalMaterial = 'MeshPhysicalMaterial'
}
const textFontLoader = new FontLoader();

/**
 * ThreejsScene Add
 */
export class DataThreejs extends DataThreejsLookAt {
    /**
     * Constructs a new data subscriber.
     */
    constructor(settings: ISettings, dataService: DataService) {
        super(settings, dataService);
        // background
        if (this.settings.background.show) {
            this._loadBackground(this.settings.background.background_set);
        } else {
            this.cameraBackgrounds = null;
            this.scene.background = new THREE.Color(this.settings.colors.viewer_bg);
        }

        // add grid and lights
        this._addGrid();
        this._addAxes();
        if (this.settings.ambient_light.show) {
            this._addAmbientLight();
        }
        if (this.settings.hemisphere_light.show) {
            this._addHemisphereLight();
        }
        if (this.settings.directional_light.show) {
            this._addDirectionalLight();
        }
    }

    /**
     *
     * @param object
     * @param property
     */
    public static disposeObjectProperty(object: THREE.Object3D, property: string): void {
        if (object.hasOwnProperty(property)) {
            if (object[property].constructor === [].constructor) {
                object[property].forEach(prop => prop.dispose());
            } else {
                object[property].dispose();
            }
        }
    }

    public async populateScene(model: Model, container) {
        const cameraSettings = localStorage.getItem('gi_camera');
        if (cameraSettings && JSON.parse(cameraSettings)) {
            const cam = JSON.parse(cameraSettings);
            this.perspCam.position.copy(cam.pos);
            this.perspControls.target.copy(cam.target);
            this.perspCam.updateProjectionMatrix();
            this.perspControls.update();
            localStorage.setItem('gi_camera', 'null');
        }
        while (this.scene.children.length > 0) {
            DataThreejs.disposeObjectProperty(this.scene.children[0], 'geometry');
            DataThreejs.disposeObjectProperty(this.scene.children[0], 'texture');
            this.scene.remove(this.scene.children[0]);
        }
        this.scene_objs = [];
        // this._buffer_geoms = [];

        document.querySelectorAll('[id^=textLabel_]').forEach(value => {
            container.removeChild(value);
        });
        this.ObjLabelMap.clear();
        this.textLabels.clear();

        await this._addGeom(model);

        const position_size = this.settings.positions.size;
        this.raycaster.params.Points.threshold = position_size > 1 ? position_size / 3 : position_size / 4;


        this._all_objs_sphere = this._getAllObjsSphere();
        this.updateCameraFOV();

        // add the axes, ground, lights, etc
        this._addEnv();

        if (!container) { return; }
        setTimeout(() => {
            // this.exportGLTF(this.scene);
            let old = document.getElementById('hud');
            if (old) {
                container.removeChild(old);
            }
            if (!this.model.modeldata.attribs.query.hasEntAttrib(GICommon.EEntType.MOD, 'hud')) { return; }
            const hud = this.model.modeldata.attribs.get.getModelAttribVal('hud') as string;
            const element = this._createHud(hud).element;
            container.appendChild(element);
            old = null;
        }, 0);
    }
    // replaces rgb values with THREE.Color objects
    private _replaceColors(materials: object[], keys: string[]): void {
        for (const mat of materials) {
            for (const color_key of keys) {
                const rgb = mat[color_key];
                if (rgb === undefined) { continue; }
                if (!Array.isArray(rgb)) { continue; }
                mat[color_key] = new THREE.Color(rgb[0], rgb[1], rgb[2]);
            }
        }
    }
    private async _addGeom(model: Model) {
        // Add geometry
        const threejs_data = model.get3jsData(this.nodeIndex);
        this.select_maps = {
            _t: threejs_data.tri_select_map,
            _e: threejs_data.edge_select_map,
            _v: threejs_data.verts_map,
            pt: threejs_data.point_select_map,
            ps: threejs_data.posis_map,

            _e_vr: threejs_data.vrmesh_edge_select_map,
            _t_vr: threejs_data.vrmesh_tri_select_map,
        };
        this.positions = [];

        // Get materials
        const pline_material_groups = threejs_data.pline_material_groups;
        const vrmesh_pline_material_groups = threejs_data.vrmesh_pline_material_groups;
        const pline_materials = threejs_data.pline_materials;
        this._replaceColors(pline_materials, ['color']);
        const pgon_material_groups = threejs_data.pgon_material_groups;
        const vrmesh_pgon_material_groups = threejs_data.vrmesh_pgon_material_groups;
        const pgon_materials = threejs_data.pgon_materials;
        this._replaceColors(pgon_materials, ['color', 'specular', 'emissive']);

        // Create buffers that will be used by all geometry
        const verts_xyz_buffer = new THREE.Float32BufferAttribute(threejs_data.verts_xyz, 3);
        const normals_buffer = new THREE.Float32BufferAttribute(threejs_data.normals, 3);
        const colors_buffer = new THREE.Float32BufferAttribute(threejs_data.colors, 3);
        const posis_xyz_buffer = new THREE.Float32BufferAttribute(threejs_data.posis_xyz, 3);
        this._addTris(threejs_data.tri_indices, threejs_data.vrmesh_tri_indices, threejs_data.vrmesh_hidden_tri_indices,
            verts_xyz_buffer, colors_buffer, normals_buffer,
            pgon_material_groups, vrmesh_pgon_material_groups, pgon_materials);
        this._addLines(threejs_data.edge_indices, threejs_data.vrmesh_edge_indices, threejs_data.vrmesh_hidden_edge_indices,
            verts_xyz_buffer, colors_buffer, pline_material_groups, vrmesh_pline_material_groups, pline_materials);
        this._addPoints(threejs_data.point_indices, verts_xyz_buffer, colors_buffer, [255, 255, 255], this.settings.positions.size + 1);

        this._addPosis(threejs_data.posis_indices, posis_xyz_buffer, this.settings.colors.position, this.settings.positions.size);

        await this._addPlaneLabels(model);

    }


    /**
     * Add background, grid, ground
     */
    private _addEnv(): void {

        // background
        if (this.settings.background.show) {
            this._loadBackground(this.settings.background.background_set);
        } else {
            this.cameraBackgrounds = null;
            this.scene.background = new THREE.Color(this.settings.colors.viewer_bg);
        }

        // add gird and axes
        this._addGrid();
        this._addAxes();
        // const center = new THREE.Vector3(0, 0, 0); // allObjs.center;
        // this.axes_pos.x = center.x;
        // this.axes_pos.y = center.y;
        // let grid_pos = this.settings.grid.pos;
        // if (!grid_pos) {
        //     grid_pos = new Vector3(0, 0, 0);
        // }
        // this.grid.position.set(grid_pos.x, grid_pos.y, -0.01);
        // this.axesHelper.position.set(grid_pos.x, grid_pos.y, 0);

        // // settings
        // // if (num_posis !== 0) {
        //     if (this.dataService.newFlowchart) {
        //         this.dataService.newFlowchart = false;
        //         this.origin = new THREE.Vector3(center.x, center.y, 0);
        //         this.settings.camera.target = this.origin ;
        //         localStorage.setItem('mpm_settings', JSON.stringify(this.settings));
        //         this.axesHelper.position.set(center.x, center.y, 0.05);
        //     } else {
        //         this.axesHelper.position.set(this.origin.x, this.origin.y, 0.05);
        //     }
        // // }

        // ground
        const ground = this.settings.ground;
        if (ground.show) {
            const planeGeometry = new THREE.PlaneBufferGeometry(ground.width, ground.length, 32, 32);
            const planeMaterial = new THREE.MeshPhongMaterial({
                color: new THREE.Color(parseInt(ground.color.replace('#', '0x'), 16)),
                shininess: ground.shininess,
                side: THREE.DoubleSide
            });
            this.groundObj = new THREE.Mesh(planeGeometry, planeMaterial);
            this.groundObj.position.setZ(ground.height);
            this.groundObj.receiveShadow = true;
            this.scene.add(this.groundObj);
        }

        if (this.settings.ambient_light.show) {
            this._addAmbientLight();
        }
        if (this.settings.hemisphere_light.show) {
            this._addHemisphereLight();
        }
        if (this.settings.directional_light.show) {
            this._addDirectionalLight();
        }
    }
    /**
     *
     * @param scale
     * @param azimuth
     * @param altitude
     */
    public getDLPosition(scale = null, azimuth = null, altitude = null): void {
        if (!scale && scale !== 0) {
            scale = this.directional_light_settings.distance;
        }
        if (!azimuth && azimuth !== 0) {
            azimuth = this.directional_light_settings.azimuth;
        }
        if (!altitude && altitude !== 0) {
            altitude = this.directional_light_settings.altitude;
        }
        if (this.model && this.model.modeldata.attribs && this.model.modeldata.attribs.query
        && this.model.modeldata.attribs.query.hasModelAttrib('directional_light')) {
            const model_light_settings: any = this.model.modeldata.attribs.get.getModelAttribVal('directional_light');
            if (model_light_settings.constructor === {}.constructor) {
                if (model_light_settings.hasOwnProperty('altitude')) {
                    altitude = model_light_settings.altitude;
                }
                if (model_light_settings.hasOwnProperty('azimuth')) {
                    azimuth = model_light_settings.azimuth;
                }
            }
        }
        if (scale === 0) { scale = 10000; }
        let azimuth_calc = 90 - azimuth;
        if (this.model && this.model.modeldata.attribs && this.model.modeldata.attribs.query
        && this.model.modeldata.attribs.query.hasModelAttrib('north')) {
            const north_attr: number[] = this.model.modeldata.attribs.get.getModelAttribVal('north') as number[];
            const north_vec = new THREE.Vector3(north_attr[0], north_attr[1], 0);
            const y_vec = new THREE.Vector3(0, 1, 0);
            const angle = north_vec.angleTo(y_vec) * 180 / Math.PI;
            if (north_attr[0] > 0) {
                azimuth_calc -= angle;
            } else {
                azimuth_calc += angle;
            }
        }
        let posX = Math.cos(altitude * Math.PI * 2 / 360) * Math.cos(azimuth_calc * Math.PI * 2 / 360) * scale * 2,
            posY = Math.cos(altitude * Math.PI * 2 / 360) * Math.sin(azimuth_calc * Math.PI * 2 / 360) * scale * 2,
            posZ = Math.sin(altitude * Math.PI * 2 / 360) * scale * 2;

        if (this._all_objs_sphere) {
            posX += this._all_objs_sphere.center.x;
            posY += this._all_objs_sphere.center.y;
            posZ += this._all_objs_sphere.center.z;
        }
        this.directional_light.position.set(posX, posY, posZ);
    }

    /**
     * Add axes
     * @param size
     */
    public _addAxes(size: number = this.settings.axes.size) {
        let i = 0;
        const length = this.scene.children.length;
        if (length !== 0) {
            for (; i < length; i++) {
                if (this.scene.children[i]) {
                    if (this.scene.children[i].name === 'AxesHelper') {
                        this.scene.children[i]['dispose']();
                        this.scene.remove(this.scene.children[i]);
                    }
                }
            }
        }
        this.axesHelper = new THREE.AxesHelper(size);
        this.axesHelper.geometry['attributes'].color = new THREE.Int16BufferAttribute(
            [1, 0, 0, 1, 0, 0,
             0, 1, 0, 0, 1, 0,
             0, 0, 1, 0, 0, 1], 3 );
        this.axesHelper.visible = this.settings.axes.show;
        if (this.axesHelper.visible) {
            this.axesHelper.name = 'AxesHelper';
            this.axesHelper.position.set(this.axes_pos.x, this.axes_pos.y, this.axes_pos.z);
            this.axesHelper.position.set(0, 0, 0);
            this.scene.add(this.axesHelper);
        }
    }
    /**
     * Draws a grid on the XY plane.
     * @param size
     */
    public _addGrid(size: number = this.settings.grid.size) {
        let i = 0;
        const length = this.scene.children.length;
        for (; i < length; i++) {
            if (this.scene.children[i]) {
                if (this.scene.children[i].name === 'GridHelper') {
                    if (this.scene.children[i]['dispose']) {
                        this.scene.children[i]['dispose']();
                    }
                    this.scene.remove(this.scene.children[i]);
                }
            }
        }
        this.grid = new THREE.GridHelper(size, size / 10, 0x888888, 0x888888);
        this.grid.visible = this.settings.grid.show;
        // todo: change grid -> grid_value
        if (this.grid.visible) {
            this.grid.name = 'GridHelper';
            const vector = new THREE.Vector3(0, 1, 0);
            this.grid.lookAt(vector);
            let pos = this.settings.grid.pos;
            if (!pos) {
                pos = new THREE.Vector3();
            }
            if (!pos.z) {
                this.grid.position.set(pos.x, pos.y, -0.01);
            } else {
                this.grid.position.set(pos.x, pos.y, pos.z);
            }
            this.scene.add(this.grid);
        }
    }
    /**
     *
     */
    public getGridPos() {
        if (this._all_objs_sphere) {
            const grd_pos = new THREE.Vector3(this._all_objs_sphere.center.x, this._all_objs_sphere.center.y, 0);
            this.grid.position.set(grd_pos.x, grd_pos.y, -0.01);
            return grd_pos;
        }
        const grid_pos = new THREE.Vector3(0, 0, 0);
        this.grid.position.set(0, 0, -0.01);
        return grid_pos;
    }

    // ============================================================================
    // ============================================================================
    // Private methods
    // ============================================================================
    // ============================================================================
    /**
     * Create the buffer for threejs triangles
     */
    private _createTrisBuffGeom(
            tris_i_buff_attrib: THREE.BufferAttribute,
            coords_buff_attrib: THREE.BufferAttribute,
            colors_buff_attrib: THREE.BufferAttribute,
            normals_buff_attrib: THREE.BufferAttribute,
            material_groups: Uint32Array): THREE.BufferGeometry {
        const tris_geom_buff = new THREE.BufferGeometry();
        tris_geom_buff.setIndex( tris_i_buff_attrib );
        tris_geom_buff.setAttribute('position', coords_buff_attrib );
        tris_geom_buff.setAttribute('color', colors_buff_attrib );
        if (normals_buff_attrib !== null) { tris_geom_buff.setAttribute('normal', normals_buff_attrib ); }
        tris_geom_buff.clearGroups();
        for (let i = 0; i < material_groups.length; i = i + 3) {
            tris_geom_buff.addGroup(material_groups[i], material_groups[i + 1], material_groups[i + 2]);
        }
        return tris_geom_buff;
    }


    /**
     * Add threejs triangles to the scene
     */
    private _addTris(tris_i: number[], vrmesh_tris_i: number[], vrmesh_hidden_tris_i: number[],
                     posis_buffer: THREE.Float32BufferAttribute,
                     colors_buffer: THREE.Float32BufferAttribute,
                     normals_buffer: THREE.Float32BufferAttribute,
                     material_groups, vrmesh_material_groups, materials): void {
        const geom = new THREE.BufferGeometry();
        geom.setIndex(tris_i);
        geom.setAttribute('position', posis_buffer);
        if (normals_buffer.count > 0) {
            geom.setAttribute('normal', normals_buffer);
        }
        geom.setAttribute('color', colors_buffer);
        const colorf = new THREE.Color(parseInt(this.settings.colors.face_f.replace('#', '0x'), 16));
        const colorb = new THREE.Color(parseInt(this.settings.colors.face_b.replace('#', '0x'), 16));
        geom.clearGroups();
        material_groups.forEach(element => {
            geom.addGroup(element[0], element[1], element[2]);
        });
        // this._buffer_geoms.push(geom);

        const vrmesh_geom = new THREE.BufferGeometry();
        vrmesh_geom.setIndex(vrmesh_tris_i);
        vrmesh_geom.setAttribute('position', posis_buffer);
        if (normals_buffer.count > 0) {
            vrmesh_geom.setAttribute('normal', normals_buffer);
        }
        vrmesh_geom.setAttribute('color', colors_buffer);
        vrmesh_geom.clearGroups();
        vrmesh_material_groups.forEach(element => {
            vrmesh_geom.addGroup(element[0], element[1], element[2]);
        });

        const vrmesh_hidden_geom = new THREE.BufferGeometry();
        vrmesh_hidden_geom.setIndex(vrmesh_hidden_tris_i);
        vrmesh_hidden_geom.setAttribute('position', posis_buffer);
        if (normals_buffer.count > 0) {
            vrmesh_hidden_geom.setAttribute('normal', normals_buffer);
        }
        vrmesh_hidden_geom.setAttribute('color', colors_buffer);
        vrmesh_hidden_geom.clearGroups();
        vrmesh_material_groups.forEach(element => {
            vrmesh_hidden_geom.addGroup(element[0], element[1], element[2]);
        });

        const material_arr = [];
        let index = 0;
        const l = materials.length;
        for (; index < l; index++) {
            const element = materials[index];
            // if (this.settings.background.show) {
            //     element.envMap = this.scene.background;
            //     // element.refractionRatio = 1;
            //     // element.envMap.mapping = THREE.CubeRefractionMapping;
            // }
            let mat;
            if (index === 0) {
                delete element.type; element.color = colorf;
                mat = new THREE.MeshPhongMaterial(element);
            } else if (index === 1) {
                delete element.type;
                element.color = colorb;
                mat = new THREE.MeshPhongMaterial(element);
            } else {
                if (element.type === MaterialType.MeshBasicMaterial) {
                    delete element.type;
                    mat = new THREE.MeshBasicMaterial(element);
                } else if (element.type === MaterialType.MeshPhongMaterial) {
                    delete element.type;
                    mat = new THREE.MeshPhongMaterial(element);
                } else if (element.type === MaterialType.MeshPhysicalMaterial) {
                    delete element.type;
                    if (this.settings.background.show) {
                        element.envMap = this.scene.background;
                    }
                    mat = new THREE.MeshPhysicalMaterial(element);
                    mat.attenuationColor = mat.attenuationColor || mat.attenuationTint;
                } else if (element.type === MaterialType.MeshLambertMaterial) {
                    delete element.type;
                    mat = new THREE.MeshLambertMaterial(element);
                } else if (element.type === MaterialType.MeshStandardMaterial) {
                    delete element.type;
                    mat = new THREE.MeshStandardMaterial(element);
                }
            }
            material_arr.push(mat);
        }
        const mesh = new THREE.Mesh(geom, material_arr);
        mesh.name = 'obj_tri';
        const vrmesh_mesh = new THREE.Mesh(vrmesh_geom, material_arr);
        vrmesh_mesh.name = 'obj_tri_navmesh';
        const vrmesh_hidden_mesh = new THREE.Mesh(vrmesh_hidden_geom, material_arr);
        vrmesh_hidden_mesh.name = 'obj_tri_hidden_navmesh';

        mesh.geometry.computeBoundingSphere();
        if (normals_buffer.count === 0) {
            mesh.geometry.computeVertexNormals();
        }
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        vrmesh_mesh.geometry.computeBoundingSphere();
        if (normals_buffer.count === 0) {
            vrmesh_mesh.geometry.computeVertexNormals();
        }
        vrmesh_mesh.castShadow = true;
        vrmesh_mesh.receiveShadow = true;

        vrmesh_hidden_mesh.geometry.computeBoundingSphere();
        if (normals_buffer.count === 0) {
            vrmesh_hidden_mesh.geometry.computeVertexNormals();
        }
        vrmesh_hidden_mesh.visible = false;

        // show vertex normals
        this.vnh = new VertexNormalsHelper(mesh, this.settings.normals.size, 0x0000ff);
        this.vnh.visible = this.settings.normals.show;
        this.scene.add(this.vnh);

        this.scene_objs.push(mesh);
        this.scene_objs.push(vrmesh_mesh);
        this.scene_objs.push(vrmesh_hidden_mesh);

        // add mesh to scene
        this.scene.add(mesh);
        this.scene.add(vrmesh_mesh);
        this.scene.add(vrmesh_hidden_mesh);
        this.threejs_nums[2] = (tris_i.length + vrmesh_tris_i.length) / 3;
    }

    // ============================================================================
    /**
     * Add threejs lines to the scene
     */
    private _addLines(lines_i: number[], vrmesh_lines_i: number[], vrmesh_hidden_lines_i: number[],
                    posis_buffer: THREE.Float32BufferAttribute,
                    color_buffer: THREE.Float32BufferAttribute,
                    material_groups, vrmesh_material_groups, materials): void {
        const geom = new THREE.BufferGeometry();
        geom.setIndex(lines_i);
        geom.setAttribute('position', posis_buffer);
        geom.setAttribute('color', color_buffer);
        // this._buffer_geoms.push(geom);

        const vrmesh_geom = new THREE.BufferGeometry();
        vrmesh_geom.setIndex(vrmesh_lines_i);
        vrmesh_geom.setAttribute('position', posis_buffer);
        vrmesh_geom.setAttribute('color', color_buffer);


        const material_arr = [];
        let index = 0;
        const l = materials.length;
        for (; index < l; index++) {
            const element = materials[index];
            if (element.type === 'LineBasicMaterial') {
                const mat = new THREE.LineDashedMaterial({
                    color: element.color || 0,
                    vertexColors: true,
                    linewidth: element.linewidth ||  1,
                    scale: 1,
                    dashSize: 1000,
                    gapSize: 0,
                    linecap: 'round', // ignored by WebGLRenderer
                    linejoin: 'round' // ignored by WebGLRenderer
                });
                material_arr.push(mat);
            } else {
                const mat = new THREE.LineDashedMaterial({
                    color: element.color || 0,
                    vertexColors: true,
                    linewidth: element.linewidth ||  1,
                    scale: element.scale || 1,
                    dashSize: element.dashSize || 2,
                    gapSize: element.gapSize !== null ? element.gapSize : 0,
                    linecap: 'round', // ignored by WebGLRenderer
                    linejoin: 'round' // ignored by WebGLRenderer
                });
                material_arr.push(mat);
            }
        }
        material_groups.forEach(element => {
            geom.addGroup(element[0], element[1], element[2]);
        });
        vrmesh_material_groups.forEach(element => {
            vrmesh_geom.addGroup(element[0], element[1], element[2]);
        });
        const newGeom = geom.toNonIndexed();
        const vrmesh_newGeom = vrmesh_geom.toNonIndexed();

        const line = new THREE.LineSegments(newGeom, material_arr);
        line.name = 'obj_line';
        line.computeLineDistances();
        this.scene_objs.push(line);
        this.scene.add(line);

        const vrmesh_line = new THREE.LineSegments(vrmesh_newGeom, material_arr);
        vrmesh_line.name = 'obj_line_navmesh';
        vrmesh_line.computeLineDistances();
        this.scene_objs.push(vrmesh_line);
        this.scene.add(vrmesh_line);

        this.threejs_nums[1] = (lines_i.length + vrmesh_lines_i.length) / 2;

    }
    // ============================================================================
    /**
     * Add threejs points to the scene
     */
    private _addPoints(points_i: number[],
                        posis_buffer: THREE.Float32BufferAttribute,
                        colors_buffer: THREE.Float32BufferAttribute,
                        color: any,
                        size: number = 1): void {
        const geom = new THREE.BufferGeometry();
        geom.setIndex(points_i);
        geom.setAttribute('position', posis_buffer);
        geom.setAttribute('color', colors_buffer);

        // this._buffer_geoms.push(geom);
        // geom.computeBoundingSphere();
        const rgb = `rgb(${color.toString()})`;
        const mat = new THREE.PointsMaterial({
            // color: new THREE.Color(rgb),
            size: size,
            vertexColors: true,
            sizeAttenuation: false
        });
        const point = new THREE.Points(geom, mat);
        point.name = 'obj_pt';
        this.scene_objs.push(point);
        this.scene.add(point);
        this.threejs_nums[0] = points_i.length;
    }
    // ============================================================================
    /**
     * Add threejs points to the scene
     */
     private async _addPlaneLabels(model: Model) {
        let pgon, pgon_label, coords_attrib;
        try {
            pgon = model.modeldata.geom.query.getEnts(GICommon.EEntType.PGON);
            pgon_label = <any> model.modeldata.attribs.get.getEntAttribVal(GICommon.EEntType.PGON, pgon, 'text');
            coords_attrib = model.modeldata.attribs.attribs_maps.get(model.modeldata.active_ssid).ps.get('xyz');
        } catch (ex) {
            return;
        }
        const pgonTextShapes = [];
        for (let i = 0; i < pgon_label.length; i ++) {
            if (!pgon_label[i]) { continue; }
            const posi = model.modeldata.geom.nav.navAnyToPosi(GICommon.EEntType.PGON, pgon[i]);
            if (posi.length > 3 || !pgon_label[i].text) { continue; }

            const labelText = pgon_label[i].text;
            const labelSize = pgon_label[i].size || 20;

            const fontType = pgon_label[i].font ? pgon_label[i].font : 'roboto';
            let fontWeight = 'medium';
            let fontStyle = 'regular';
            if (pgon_label[i].font_style) {
                if (pgon_label[i].font_style.indexOf('light') !== -1) { fontWeight = 'light'; }
                if (pgon_label[i].font_style.indexOf('bold') !== -1) { fontWeight = 'bold'; }
                if (pgon_label[i].font_style.indexOf('italic') !== -1) { fontStyle = 'italic'; }
            }
            const fontCode = `${fontType}_${fontWeight}_${fontStyle}`;
            if (!this._text_font[fontCode]) {
                await this._loadFont(fontCode);
            }
            const shape = this._text_font[fontCode].generateShapes( labelText, labelSize);
            const geom = new THREE.ShapeBufferGeometry(shape);

            const lengthCheck = [];
            const coords = <any> posi.map(p => new THREE.Vector3(...coords_attrib.getEntVal(p)));
            for (let j = 0; j < coords.length; j++) {
                const p0 = coords[j];
                const p1 = (j === posi.length - 1) ? coords[0] : coords[j + 1];
                lengthCheck.push(p0.distanceTo(p1));
            }
            if (lengthCheck[1] > lengthCheck[2]) {
                [lengthCheck[1], lengthCheck[2]] = [lengthCheck[2], lengthCheck[1]];
                [coords[0], coords[1]] = [coords[1], coords[0]];
            }
            if (lengthCheck[0] > lengthCheck[1]) {
                [lengthCheck[0], lengthCheck[1]] = [lengthCheck[1], lengthCheck[0]];
                [coords[0], coords[2]] = [coords[2], coords[0]];
            }
            if (lengthCheck[1] > lengthCheck[2]) {
                [lengthCheck[1], lengthCheck[2]] = [lengthCheck[2], lengthCheck[1]];
                [coords[0], coords[1]] = [coords[1], coords[0]];
            }
            const rotQuat = this.rotateQuartenion(coords);
            geom.applyQuaternion(rotQuat);
            geom.translate(coords[1].x, coords[1].y, coords[1].z);

            let color = new THREE.Color(0);
            if (pgon_label[i].color  && pgon_label[i].color.length === 3) {
                color = new THREE.Color(`rgb(${pgon_label[i].color[0]}, ${pgon_label[i].color[1]}, ${pgon_label[i].color[2]})`);
            }
            const colors_buffer = new THREE.Float32BufferAttribute(new Uint8Array(geom.attributes.position.count * 3), 3);
            if (pgon_label[i].color && pgon_label[i].color.length === 3) {
                for (let k = 0; k < colors_buffer.count; k++) {
                    colors_buffer.setXYZ(k, pgon_label[i].color[0], pgon_label[i].color[1], pgon_label[i].color[2]);
                }
            }
            geom.setAttribute('color', colors_buffer);
            pgonTextShapes.push(geom);
        }
        if (pgonTextShapes.length === 0) { return; }
        const pgonMergedGeom = mergeBufferGeometries(pgonTextShapes);
        const pgonText = new THREE.Mesh(pgonMergedGeom , new THREE.MeshBasicMaterial( {
            transparent: false,
            side: THREE.DoubleSide,
            vertexColors: true
        }));
        this.scene.add(pgonText);
        // this.renderer.render(this.scene, this.camera);
        this.renderer.render(this.scene, this.camera);
    }

    rotateQuartenion(targetCoords: [THREE.Vector3, THREE.Vector3, THREE.Vector3]): THREE.Quaternion {
        const v1y = new THREE.Vector3(0, 1, 0);
        const v2x = new THREE.Vector3().copy(targetCoords[2]).sub(targetCoords[1]).normalize();
        const v2y = new THREE.Vector3().copy(targetCoords[0]).sub(targetCoords[1]).normalize();
        const n1 = new THREE.Vector3(0, 0, 1);
        const n2 = v2x.cross(v2y);
        const quat1 = new THREE.Quaternion().setFromUnitVectors(n1, n2);
        const quat2 = new THREE.Quaternion().setFromUnitVectors(v1y.applyQuaternion(quat1), v2y);
        const QuatFinal = quat2.multiply(quat1);
        return QuatFinal;
    }


    // ============================================================================
    /**
     * Add threejs positions to the scene
     */
    private _addPosis(points_i: number[],
        posis_buffer: THREE.Float32BufferAttribute,
        color: string,
        size: number = 1): void {
        const geom = new THREE.BufferGeometry();
        geom.setIndex(points_i);
        geom.setAttribute('position', posis_buffer);
        // this._buffer_geoms.push(geom);
        // geom.computeBoundingSphere();
        const mat = new THREE.PointsMaterial({
            color: new THREE.Color(parseInt(color.replace('#', '0x'), 16)),
            size: size,
            sizeAttenuation: false
            // vertexColors: true
        });
        const point = new THREE.Points(geom, mat);
        this.scene_objs.push(point);
        this.scene.add(point);
        this.positions.push(point);
        this.positions.map(p => p.visible = this.settings.positions.show);
    }
    // ============================================================================
    /**
     *
     * @param text
     */
    private _createHud(text: string) {
        const div = document.createElement('div');
        div.id = `hud`;
        div.style.position = 'absolute';
        div.style.background = 'rgba(255, 255, 255, 0.3)';
        div.style.padding = '5px';
        div.innerHTML = text;
        div.style.top = '40px';
        div.style.left = '5px';
        div.style.maxWidth = '200px';
        div.style.whiteSpace = 'pre-wrap';
        div.style.fontSize = '14px';
        return {
            element: div
        };
    }
    /**
     *
     * @param background_set
     */
    private _loadBackground(background_set: number) {
        const path = 'assets/img/background/bg' + background_set + '/';
        const format = '.jpg';
        const urls = [
            path + 'px' + format, path + 'nx' + format,
            path + 'py' + format, path + 'ny' + format,
            path + 'pz' + format, path + 'nz' + format
        ];
        this.cameraBackgrounds = {};
        new THREE.CubeTextureLoader().load(urls, texture => {
            this.renderer.render(this.scene, this.camera);
            texture.format = THREE.RGBFormat;
            this.cameraBackgrounds['Persp'] = texture;
            this.scene.background = this.cameraBackgrounds[this.currentCamera];
        });
        new THREE.TextureLoader().load(path + 'nz' + format, texture => {
            this.renderer.render(this.scene, this.camera);
            texture.format = THREE.RGBFormat;
            this.cameraBackgrounds['Top'] = texture;
            this.scene.background = this.cameraBackgrounds[this.currentCamera];
        });
        new THREE.TextureLoader().load(path + 'left' + format, texture => {
            this.renderer.render(this.scene, this.camera);
            texture.format = THREE.RGBFormat;
            this.cameraBackgrounds['Left'] = texture;
            this.scene.background = this.cameraBackgrounds[this.currentCamera];
        });
        new THREE.TextureLoader().load(path + 'front' + format, texture => {
            this.renderer.render(this.scene, this.camera);
            texture.format = THREE.RGBFormat;
            this.cameraBackgrounds['Front'] = texture;
            this.scene.background = this.cameraBackgrounds[this.currentCamera];
        });

        // this._renderer.render(this._scene, this._camera);
    }

    /**
     * Create ambient light
     */
    private _addAmbientLight() {
        const color = new THREE.Color(parseInt(this.settings.ambient_light.color.replace('#', '0x'), 16));
        const intensity = this.settings.ambient_light.intensity;
        this.ambient_light = new THREE.AmbientLight(color, intensity); // soft white light
        this.ambient_light.castShadow = false;
        this.scene.add(this.ambient_light);
    }

    /**
     * Create hemisphere light
     */
    private _addHemisphereLight() {
        const skyColor = new THREE.Color(parseInt(this.settings.hemisphere_light.skyColor.replace('#', '0x'), 16));
        const groundColor = new THREE.Color(parseInt(this.settings.hemisphere_light.groundColor.replace('#', '0x'), 16));
        const intensity = this.settings.hemisphere_light.intensity;
        this.hemisphere_light = new THREE.HemisphereLight(
            skyColor, // skyColor
            groundColor, // groundColor
            intensity // intensity
        );
        this.scene.add(this.hemisphere_light);
        const helper = new THREE.HemisphereLightHelper(this.hemisphere_light, 10);
        helper.visible = this.settings.hemisphere_light.helper;
        this.scene.add(helper);
    }

    // Create Directional Light
    private _addDirectionalLight(): void {
        this.directional_light_settings = JSON.parse(JSON.stringify(this.settings.directional_light));
        if (this.model
        && this.model.modeldata.attribs
        && this.model.modeldata.attribs.query
        && this.model.modeldata.attribs.query.hasModelAttrib('directional_light')) {
            const model_light_settings: any = this.model.modeldata.attribs.get.getModelAttribVal('directional_light');
            if (model_light_settings.constructor === {}.constructor) {
                for (const i in model_light_settings) {
                    if (model_light_settings[i]) {
                        this.directional_light_settings[i] = model_light_settings[i];
                    }
                }
            }
        }

        this.directional_light = new THREE.DirectionalLight(this.directional_light_settings.color,
            this.directional_light_settings.intensity);

        // if (this.directional_light_settings.type === 'directional') {
        //     this.directional_light = new THREE.DirectionalLight(this.directional_light_settings.color,
        //         this.directional_light_settings.intensity);
        // } else {
        //     this.directional_light = new THREE.PointLight(this.directional_light_settings.color,
        //         this.directional_light_settings.intensity);
        // }
        let distance = 0;

        if (this._all_objs_sphere) {
            distance = Math.round(this._all_objs_sphere.radius);
            // if (distance < 10000) { distance = 10000; }
        }
        this.directional_light_settings.distance = distance;
        // this.getDLPosition(distance);
        this.directional_light.castShadow = this.directional_light_settings.shadow;
        this.directional_light.visible = this.directional_light_settings.show;
        // this.directional_light_settings.shadowSize = 2;
        // const shadowMapSize = this.directional_light_settings.shadowSize;
        if (this.directional_light_settings.shadowSize <= 10) {
            this.directional_light_settings.shadowSize = this.directional_light_settings.shadowSize * 512;
        }
        if (this.directional_light_settings.shadowSize < 1024) {
            this.directional_light_settings.shadowSize = 2048;
        }
        this.directional_light.shadow.mapSize.width = this.directional_light_settings.shadowSize;  // default
        this.directional_light.shadow.mapSize.height = this.directional_light_settings.shadowSize; // default
        // this.directional_light.shadow.camera.visible = true;

        this._setDLDistance(distance);
        this.scene.add(this.directional_light);
    }

    /**
     * Get the bounding sphere of all objects
     */
    private _getAllObjsSphere() {
        if (this.scene_objs.length !== 0) {
            const objs = new THREE.Object3D();
            this.scene_objs.map(obj => objs.children.push(obj));
            const boxHelper = new THREE.BoxHelper(objs);
            boxHelper.geometry.computeBoundingSphere();
            const boundingSphere = boxHelper.geometry.boundingSphere;
            return boundingSphere;
        } else {
            return null;
        }
    }
    /**
     *
     * @param size
     */
    private _setDLDistance(size = null): void {
        let scale;
        if (size) {
            scale = size;
        } else {
            scale = 10000;
        }
        if (this.directional_light) {
            let i = 0;
            const length = this.scene.children.length;
            if (length !== 0) {
                for (; i < length; i++) {
                    if (this.scene.children[i]) {
                        if (this.scene.children[i].name === 'DLHelper' || this.scene.children[i].name === 'lightTarget') {
                            this.scene.children[i]['dispose']();
                            this.scene.remove(this.scene.children[i]);
                        }
                    }
                }
            }
            this.directional_light.shadow.camera.near = 0.5;

            // let altitude = this.directional_light_settings.altitude;
            // if (altitude < 3) { altitude = 3; }
            // const altitudeOffset = Math.sin(altitude * Math.PI / 180);
            this.directional_light.shadow.camera.far = scale * 20;
            this.directional_light.shadow.bias = -0.0001;

            let helper;

            const cam = <THREE.OrthographicCamera> this.directional_light.shadow.camera;
            cam.up.set(0, 0, 1);
            cam.left = -scale;
            cam.right = scale;
            cam.top = scale;
            cam.bottom = -scale;
            if (this._all_objs_sphere) {
                const lightTarget = new THREE.Object3D();
                lightTarget.position.set(
                    this._all_objs_sphere.center.x, this._all_objs_sphere.center.y, this._all_objs_sphere.center.z);
                lightTarget.name = 'lightTarget';
                this.scene.add(lightTarget);
                (<THREE.DirectionalLight>this.directional_light).target = lightTarget;
            }
            helper = new THREE.CameraHelper(this.directional_light.shadow.camera);

            // if (this.directional_light_settings.type === 'directional') {
            //     const cam = <THREE.OrthographicCamera> this.directional_light.shadow.camera;
            //     cam.left = -scale;
            //     cam.right = scale;
            //     cam.top = scale;
            //     cam.bottom = -scale;
            //     if (this._all_objs_sphere) {
            //         const lightTarget = new THREE.Object3D();
            //         lightTarget.position.set(
            //             this._all_objs_sphere.center.x, this._all_objs_sphere.center.y, this._all_objs_sphere.center.z);
            //         lightTarget.name = 'lightTarget';
            //         this.scene.add(lightTarget);
            //         (<THREE.DirectionalLight>this.directional_light).target = lightTarget;
            //     }
            //     helper = new THREE.CameraHelper(this.directional_light.shadow.camera);
            // } else {
            //     helper = new THREE.PointLightHelper( <THREE.PointLight>this.directional_light );
            // }
            helper.visible = this.directional_light_settings.helper;
            helper.name = 'DLHelper';
            if (size) { this.scene.add(helper); }
            this.getDLPosition(scale);
        }
    }

    exportGLTF( input ) {
        let i = 0;
        input.children.splice(3, 1);
        input.children.splice(0, 1);
        while (i < input.children.length) {
            if (input.children[i].name !== '' || input.children[i].type === 'AmbientLight' ||
            input.children[i].type === 'HemisphereLight'
            // || input.children[i].type === 'LineSegments'
            ) {
                input.children.splice(i, 1);
                continue;
            }
            i++;
        }
        const gltfExporter = new GLTFExporter();
        const options = {
            trs: false,
            onlyVisible: false
        };
        gltfExporter.parse( input, function ( result ) {
                const output = JSON.stringify( result, null, 2 );
                console.log( output );
        }, options );
    }

    private async _loadFont(fontCode) {
        const p = new Promise<void>(resolve => {
            textFontLoader.load( `assets/fonts/${fontCode}.json`, font => {
                this._text_font[fontCode] = font;
                resolve();
            });
        });
        await p;
    }
}

