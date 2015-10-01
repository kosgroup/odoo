odoo.define('web.planner', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');
var Model = require('web.Model');
var SystrayMenu = require('web.SystrayMenu');
var Widget = require('web.Widget');
var planner = require('web.planner.common');
var webclient = require('web.web_client');

var QWeb = core.qweb;
var _t = core._t;
var PlannerDialog = planner.PlannerDialog;

var PlannerLauncher = Widget.extend(planner.PlannerHelpMixin, {
    template: "PlannerLauncher",
    init: function(parent) {
        this._super(parent);
        this.planner_by_menu = {};
        this.need_reflow = false;
    },
    start: function() {
        var self = this;
        core.bus.on("change_menu_section", self, self.on_menu_clicked);

        var res =  self._super.apply(this, arguments).then(function() {
            self.$el.filter('.o_planner_systray').on('click', self, self.show_dialog.bind(self));
            self.$el.filter('.o_planner_help').on('click', '.dropdown-menu li a[data-menu]', self.on_menu_help);
            return self.fetch_application_planner();
        }).then(function(apps) {
            self.$el.filter('.o_planner_systray').hide();  // hidden by default
            self.$el.filter('.o_planner_help').find('.o_planner_link').hide();
            self.$('.progress').tooltip({html: true, placement: 'bottom', delay: {'show': 500}});
            self.planner_apps = apps;
            return apps;
        });
        return res;
    },
    fetch_application_planner: function() {
        var self = this;
        var def = $.Deferred();
        if (!_.isEmpty(this.planner_by_menu)) {
            def.resolve(self.planner_by_menu);
        }else{
            (new Model('web.planner')).query().all().then(function(res) {
                _.each(res, function(planner){
                    self.planner_by_menu[planner.menu_id[0]] = planner;
                    self.planner_by_menu[planner.menu_id[0]].data = $.parseJSON(self.planner_by_menu[planner.menu_id[0]].data) || {};
                });
                def.resolve(self.planner_by_menu);
            }).fail(function() {def.reject();});
        }
        return def;
    },
    on_menu_clicked: function(menu_id) {
        if (_.contains(_.keys(this.planner_apps), menu_id.toString())) {
            this.setup(this.planner_apps[menu_id]);
            this.need_reflow = true;
        } else {
            this.$el.filter('.o_planner_systray').hide();
            this.$el.filter('.o_planner_help').find('.o_planner_link').hide();
            this.need_reflow = true;
        }
        if (this.need_reflow) {
            core.bus.trigger('resize');
            this.need_reflow = false;
        }

        if (this.dialog) {
            this.dialog.$el.modal('hide');
            this.dialog.$el.detach();
        }
    },
    on_menu_help: function(ev) {
        ev.preventDefault();

        var menu = $(ev.currentTarget).data('menu');
        if (menu === 'about') {
            var self = this;
            self.rpc("/web/webclient/version_info", {}).done(function(res) {
                var $help = $(QWeb.render("PlannerLauncher.about", {version_info: res}));
                $help.find('a.oe_activate_debug_mode').click(function (e) {
                    e.preventDefault();
                    window.location = $.param.querystring( window.location.href, 'debug');
                });
                new Dialog(this, {
                    size: 'medium',
                    dialogClass: 'o_act_window',
                    title: _t("About"),
                    $content: $help
                }).open();
            });
        } else if (menu === 'documentation') {
            window.open('http://nextgerp.com/en/why-nextg-erp/odoo-is-our-core/docs-lib', '_blank');
        } else if (menu === 'planner') {
            if (this.dialog) this.show_dialog();
        } else if (menu === 'support') {
            window.open('http://nextgerp.com/en/support/forums', '_blank');
        }
    },
    setup: function(planner) {
        var self = this;

        this.planner = planner;
        if (this.dialog) {
            this.dialog.$el.modal('hide');
            this.dialog.destroy();
        }
        this.dialog = new PlannerDialog(this, planner);
        this.dialog.appendTo($('<div>'));

        this.$('.progress').attr('data-original-title', this.planner.tooltip_planner);
        this.$el.filter('.o_planner_help').find('.o_planner_link').show();

        this.dialog.on("planner_progress_changed", this, function(percent){
            self.update_parent_progress_bar(percent);
        });
    },
    update_parent_progress_bar: function(percent) {
        if (percent == 100) {
            this.$(".progress").hide();
        } else {
            this.$(".progress").show();
        }
        this.$el.filter('.o_planner_systray').show();
        this.$(".progress-bar").css('width', percent+"%");
    },
    show_dialog: function() {
        this.dialog.$el.appendTo(webclient.$el);
        this.dialog.$el.modal('show');
    },
});

SystrayMenu.Items.push(PlannerLauncher);

return {
    PlannerLauncher: PlannerLauncher,
};

});

