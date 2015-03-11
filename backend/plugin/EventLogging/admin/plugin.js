/**
 * plugin.js
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspeaker.com/license.php
 */
	 
!function($, kloudspeaker) {

	"use strict"; // jshint ;_;

	kloudspeaker.view.config.admin.EventLogging = {
		AllEventsView : function() {
			var that = this;
			this.viewId = "events";

			this.init = function(s, cv) {
				that._cv = cv;
				that.title = kloudspeaker.ui.texts.get("pluginEventLoggingAdminNavTitle");
				
				that._timestampFormatter = new kloudspeaker.ui.formatters.Timestamp(kloudspeaker.ui.texts.get('shortDateTimeFormat'));
				kloudspeaker.service.get("events/types/").done(function(t) {
					that._types = [];
					that._typeTexts = t;
					for (var k in t) {
						if (t[k])
							that._types.push(k);
					}
				});
			}

			this.onActivate = function($c) {
				that._cv.showLoading(true);
				that._details = kloudspeaker.ui.controls.slidePanel($("#kloudspeaker-mainview-viewcontent"), { resizable: true });
				
				kloudspeaker.service.get("configuration/users/").done(function(users) {
					that._cv.showLoading(false);

					var listView = false;
					var $optionType = false;
					var $optionUser = false;
					var $optionStart = false;
					var $optionEnd = false;
								
					var getQueryParams = function(i) {
						var start = $optionStart.get();
						var end = $optionEnd.get();
						var tp = $optionType.get();
						if (tp == "custom") tp = $("#eventlogging-event-type-custom").val();
						if (!tp || tp.length === 0) tp = null;
						var user = $optionUser.get();
						
						var params = {};
						if (start) params.start_time = kloudspeaker.helpers.formatInternalTime(start);
						if (end) params.end_time = kloudspeaker.helpers.formatInternalTime(end);
						if (user) params.user = user.name;
						if (tp) params.type = tp;
						
						return params;
					}
					
					var refresh = function() {
						that._cv.showLoading(true);
						listView.table.refresh().done(function(){ that._cv.showLoading(false); });
					}
		
					listView = new kloudspeaker.view.ConfigListView($c, {
						actions: [
							{ id: "action-refresh", content:'<i class="icon-refresh"></i>', callback: refresh }
						],
						table: {
							id: "config-admin-folders",
							key: "id",
							narrow: true,
							hilight: true,
							remote: {
								path : "eventlog/query",
								paging: { max: 50 },
								queryParams: getQueryParams,
								onLoad: function(pr) { $c.addClass("loading"); pr.done(function() { $c.removeClass("loading"); }); }
							},
							defaultSort: { id: "time", asc: false },
							columns: [
								{ type:"selectrow" },	//TODO icon based on event type
								{ id: "id", title: kloudspeaker.ui.texts.get('configAdminTableIdTitle'), sortable: true },
								{ id: "type", title: kloudspeaker.ui.texts.get('pluginEventLoggingEventTypeTitle'), sortable: true },
								{ id: "user", title: kloudspeaker.ui.texts.get('pluginEventLoggingUserTitle'), sortable: true },
								{ id: "time", title: kloudspeaker.ui.texts.get('pluginEventLoggingTimeTitle'), formatter: that._timestampFormatter, sortable: true },
								{ id: "ip", title: kloudspeaker.ui.texts.get('pluginEventLoggingIPTitle'), sortable: true }
							],
							onHilight: function(e) {
								if (e) {
									that._showEventDetails(e, that._details.getContentElement().empty());
									that._details.show(false, 400);
								} else {
									that._details.hide();
								}
							}
						}
					});
					var $options = $c.find(".kloudspeaker-configlistview-options");
					kloudspeaker.templates.load("eventlogging-content", kloudspeaker.helpers.noncachedUrl(kloudspeaker.plugins.adminUrl("EventLogging", "content.html"))).done(function() {
						kloudspeaker.dom.template("kloudspeaker-tmpl-eventlogging-options").appendTo($options);
						kloudspeaker.ui.process($options, ["localize"]);
						
						$optionType = kloudspeaker.ui.controls.select("eventlogging-event-type", {
							values: that._types.concat(["custom"]),
							formatter: function(v) {
								if (v == "custom") return kloudspeaker.ui.texts.get('pluginEventLoggingAdminEventTypeCustom');
								return that._typeTexts[v] + " ("+v+")";
							},
							none: kloudspeaker.ui.texts.get('pluginEventLoggingAdminAny'),
							onChange: function(t) {
								if (t == "custom")
									$("#eventlogging-event-type-custom").show().val("").focus();
								else
									$("#eventlogging-event-type-custom").hide();
							}
						});
						$optionUser = kloudspeaker.ui.controls.select("eventlogging-user", {
							values: users,
							formatter: function(u) { return u.name; },
							none: kloudspeaker.ui.texts.get('pluginEventLoggingAdminAny')
						});
						$optionStart = kloudspeaker.ui.controls.datepicker("eventlogging-start", {
							format: kloudspeaker.ui.texts.get('shortDateTimeFormat'),
							time: true
						});
						$optionEnd = kloudspeaker.ui.controls.datepicker("eventlogging-end", {
							format: kloudspeaker.ui.texts.get('shortDateTimeFormat'),
							time: true
						});
						refresh();
					});
				});
			};
			
			this._showEventDetails = function(e, $e) {
				var d = false;
				if (e.details) {
					d = [];
					$.each(e.details.split(';'), function(i, dr) {
						var p = dr.split('=');
						d.push({title: p[0], value: p[1]});
					});
				}
				kloudspeaker.dom.template("kloudspeaker-tmpl-config-eventlogging-eventdetails", {event: e, details: d}, {
					formatTimestamp: that._timestampFormatter.format,
					formatItem: function(e) { return e.item.replace(/,/g, "<br/>"); }
				}).appendTo($e);
				kloudspeaker.ui.process($e, ["localize"]);
			}
		}
	}

	kloudspeaker.admin.plugins.EventLogging = {
		resources : {
			texts: true
		},
		views: [
			new kloudspeaker.view.config.admin.EventLogging.AllEventsView()
		]
	};
}(window.jQuery, window.kloudspeaker);
