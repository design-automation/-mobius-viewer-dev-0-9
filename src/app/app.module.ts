import { NgModule } from '@angular/core';

import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';


import { AppComponent } from './app.component';
import { GIViewerComponent } from './gi-viewer/gi-viewer.component';
import { GIViewerModule } from './gi-viewer/gi-viewer';
import { DataService as GIDataService } from './gi-viewer/data/data.service';
import { DataService } from '@services';
import { DragDirective } from './directives/dragDropDirective';
import { MatIconModule } from '@angular/material/icon';
import { VIEWER_ARR, VIEWER_MOD } from './model-viewers.config';
import { SpinnerComponent } from './spinner/spinner.component';
import { DataGeoService } from './gi-geo-viewer/data/data.geo.service';
import { DataAframeService } from './aframe-viewer/data/data.aframe.service';

@NgModule({
  declarations: [
    AppComponent,
    DragDirective,
    SpinnerComponent
  ],
  imports: [
    HttpClientModule,
    BrowserModule,
    BrowserAnimationsModule,
    MatIconModule,
    ...VIEWER_MOD,
  ],
  entryComponents: [
    SpinnerComponent,
    ...VIEWER_ARR
  ],
  providers: [ GIDataService, DataGeoService, DataAframeService, DataService ],
  bootstrap: [ AppComponent ]
})
export class AppModule {
    /**
     * constructor
     */
    constructor () {
        // Do nothing
    }
}

