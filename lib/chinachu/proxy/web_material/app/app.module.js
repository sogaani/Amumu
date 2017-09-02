"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@angular/core");
var core_2 = require("@angular-mdl/core");
var platform_browser_1 = require("@angular/platform-browser");
var forms_1 = require("@angular/forms");
var http_1 = require("@angular/http");
var app_routing_module_1 = require("./app-routing.module");
var app_component_1 = require("./app.component");
var dashboard_component_1 = require("./dashboard.component");
var reservelist_component_1 = require("./reservelist.component");
var shucedule_component_1 = require("./shucedule.component");
var shuceduledetail_component_1 = require("./shuceduledetail.component");
var programdetail_component_1 = require("./programdetail.component");
var carousel_component_1 = require("./carousel.component");
var reserve_service_1 = require("./reserve.service");
var shucedule_service_1 = require("./shucedule.service");
var socketio_service_1 = require("./socketio.service");
var AppModule = (function () {
    function AppModule() {
    }
    return AppModule;
}());
AppModule.decorators = [
    { type: core_1.NgModule, args: [{
                imports: [
                    platform_browser_1.BrowserModule,
                    forms_1.FormsModule,
                    http_1.HttpModule,
                    core_2.MdlModule,
                    app_routing_module_1.AppRoutingModule
                ],
                declarations: [
                    app_component_1.AppComponent,
                    dashboard_component_1.DashboardComponent,
                    reservelist_component_1.ReserveListComponent,
                    programdetail_component_1.ProgramDetailComponent,
                    shucedule_component_1.ShuceduleComponent,
                    shuceduledetail_component_1.ShuceduleDetailComponent,
                    carousel_component_1.Carousel
                ],
                providers: [shucedule_service_1.ShuceduleService, reserve_service_1.ReserveService, socketio_service_1.SocketIOService],
                bootstrap: [app_component_1.AppComponent]
            },] },
];
/** @nocollapse */
AppModule.ctorParameters = function () { return []; };
exports.AppModule = AppModule;
//# sourceMappingURL=app.module.js.map