"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@angular/core");
var reserve_service_1 = require("./reserve.service");
var core_2 = require("@angular-mdl/core");
var ReserveListComponent = (function () {
    function ReserveListComponent(shuceduleService) {
        var _this = this;
        this.shuceduleService = shuceduleService;
        this.tableModel = new core_2.MdlDefaultTableModel([
            { key: 'category', name: 'Category', sortable: true },
            { key: 'title', name: 'Title', sortable: true },
            { key: 'startString', name: 'Datetime', sortable: true }
        ]);
        this.shuceduleService.getEvent().subscribe(function () {
            _this.programs = _this.shuceduleService.getShucedule();
            _this.tableModel.addAll(_this.programs);
        });
    }
    ReserveListComponent.prototype.ngOnInit = function () {
    };
    return ReserveListComponent;
}());
ReserveListComponent.decorators = [
    { type: core_1.Component, args: [{
                selector: 'reserve-list',
                template: '<mdl-table mdl-shadow="2" [table-model]="tableModel">'
                //template:'</mdl-table><program-detail *ngFor="let program of programs" [program]="program"></program-detail>'
            },] },
];
/** @nocollapse */
ReserveListComponent.ctorParameters = function () { return [
    { type: reserve_service_1.ReserveService, },
]; };
exports.ReserveListComponent = ReserveListComponent;
//# sourceMappingURL=reservelist.component.js.map