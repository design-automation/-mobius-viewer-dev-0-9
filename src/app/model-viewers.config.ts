import { IView } from './view.interface';
import { GIViewerModule } from './gi-viewer/gi-viewer';

import { GIViewerComponent } from './gi-viewer/gi-viewer.component';

import { GIGeoViewerComponent } from './gi-geo-viewer/gi-geo-viewer.component';
import { GIGeoViewerModule } from './gi-geo-viewer/gi-geo-viewer';

import { AframeViewerComponent } from './aframe-viewer/aframe-viewer.component';
import { AframeViewerModule } from './aframe-viewer/aframe-viewer.module';

// Viewer Components array
export const VIEWER_ARR = [
    // Step-1: Add Component here
    GIViewerComponent,
    GIGeoViewerComponent,
    AframeViewerComponent,
    // CytoscapeViewerComponent
];

// Viewer modules array
export const VIEWER_MOD = [
    // Step-2: Add Module here
    GIViewerModule,
    GIGeoViewerModule,
    AframeViewerModule,
    // CytoscapeViewerModule,
];

// Viewers
export const Viewers: IView[] = [
    // Step-3: Add Viewer Definition here: name, icon and component
    // The order of these views here will influence the order of the view appearing in the viewer header.
    { name: 'CAD Viewer', icon: undefined, component: GIViewerComponent },
    { name: 'Geo Viewer', icon: undefined, component: GIGeoViewerComponent },
    { name: 'VR Viewer', icon: undefined, component: AframeViewerComponent },
];

