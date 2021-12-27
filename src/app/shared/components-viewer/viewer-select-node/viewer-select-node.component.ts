// import { AfterViewInit, Component, Input, OnChanges, } from '@angular/core';
// import { Model } from '@design-automation/mobius-sim-funcs';
// import { DataService } from '@shared/services';

// @Component({
//     selector: 'viewer-select-node',
//     templateUrl: 'viewer-select-node.component.html',
//     styleUrls: ['viewer-select-node.component.scss']
// })
// export class ViewerSelectNodeComponent implements OnChanges {
//     @Input() model: Model;
//     @Input() nodeIndex: number;

//     timelineEnabled = null;
//     timeline_groups = null;
//     timelineIndex = null;
//     timelineValue = null;

//     constructor(private dataService: DataService) {}

//     ngOnChanges(changes) {
//         if (this.model && (this.nodeIndex || this.nodeIndex === 0)) {
//             setTimeout(() => {
//                 this._getNodeSelect(changes);
//             }, 0);
//         }
//     }

//     private _getNodeSelect(changes): void {
//         if (!this.model) { return; }
//         const select_node: any = this.model.modeldata.attribs.get.getModelAttribVal('select_node');
//         this.timelineEnabled = null;
//         if (!select_node || !select_node.nodes) { return; }
//         this.timeline_groups = select_node.nodes;
//         const currentIndex = this.timeline_groups.indexOf(this.dataService.node.name);
//         if (currentIndex !== -1) {
//             this.timelineEnabled = 1;
//             this.timelineIndex = currentIndex.toString();
//             this.timelineValue = this.dataService.node.name;
//             if (select_node.widget === 'dropdown') {
//                 this.timelineEnabled = 2;
//             }
//         }
//         if (changes['model'] && this.dataService.timelineDefault && select_node.default) {
//             setTimeout(() => {
//                 this.updateNode(select_node.default);
//             }, 10);
//         }
//     }


//     getMaxNodeSelect() {
//         if (this.timeline_groups) {
//             return this.timeline_groups.length - 1;
//         }
//         return 0;
//     }

//     getSliderWidth() {
//         let width = 10;
//         for (const g of this.timeline_groups) {
//             width += g.length * 7 + 5;
//         }
//         return width + 'px';
//     }

//     changeNodeSlider(event: Event) {
//         setTimeout(() => {
//             this.updateNode(this.timeline_groups[(<HTMLInputElement> event.target).value]);
//         }, 10);
//     }

//     changeNodeDropdown(event: Event) {
//         setTimeout(() => {
//             this.updateNode((<HTMLInputElement> event.target).value);
//         }, 10);
//     }

//     updateNode(selectedNode) {
//         if (selectedNode === this.dataService.node.name) { return; }
//         for (let i = 0; i < this.dataService.flowchart.nodes.length; i ++) {
//             const node = this.dataService.flowchart.nodes[i];
//             if (node.name === selectedNode) {
//                 this.dataService.flowchart.meta.selected_nodes = [i];
//                 return;
//             }
//         }
//     }

// }
