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
	
	var availableFilters = [
		{
			events: "^filesystem/.*",
			filters: [
				"item_parent",
				"item_any_parent",
				"item_name"
			]
		}
	];
	var filterEditorTypes = {
		"item_parent" : "folder",
		"item_any_parent" : "folder",
		"item_name" : "string"
	};
	var filterEditors = {
		"folder": {
			init : function($e, onValueChangeCb) {
				kloudspeaker.dom.template("kloudspeaker-tmpl-notificator-filtereditor-folder").appendTo($e);
				
				var selected = false;
				var $val = $e.find(".kloudspeaker-notificator-filtereditor-folder-value");
				var onSelect = function(f) {
					selected = f;
					$val.val(filterEditors.folder.getVisibleValue(f));
					if (onValueChangeCb) onValueChangeCb();
				};
				$e.find(".kloudspeaker-notificator-filtereditor-folder-select").click(function() {
					kloudspeaker.ui.dialogs.folderSelector({
						title: kloudspeaker.ui.texts.get('pluginNotificatorNotificationEventFilterFolderEditorSelectTitle'),
						message: kloudspeaker.ui.texts.get('pluginNotificatorNotificationEventFilterFolderEditorSelectMsg'),
						actionTitle: kloudspeaker.ui.texts.get('ok'),
						handler: {
							onSelect: onSelect,
							canSelect: function(f) { return true; }
						}
					});
				}).focus();
				
				return {
					hasValue : function() {
						return !!selected;
					},
					getValue : function() {
						return selected;
					}
				};
			},
			getVisibleValue : function(item) {
				return kloudspeaker.filesystem.rootsById[item.root_id].name + ":" + item.path;
			}
		},
		"string": {
			init : function($e, onValueChangeCb) {
				kloudspeaker.dom.template("kloudspeaker-tmpl-notificator-filtereditor-string").appendTo($e);								
				var $val = $e.find(".kloudspeaker-notificator-filtereditor-string-value");
				if (onValueChangeCb) $val.keyup(onValueChangeCb);
				$val.focus();
				
				return {
					hasValue : function() {
						var val = $val.val();
						return val && val.length > 0;
					},
					getValue : function() {
						return $val.val();
					}
				};
			},
			getVisibleValue : function(s) {
				return s;
			}
		}
	};

	kloudspeaker.view.config.admin.Notificator = {
		NotificationsView : function() {
			var that = this;
			this.viewId = "notificator";

			this.init = function(s, cv) {
				that._cv = cv;
				that.title = kloudspeaker.ui.texts.get("pluginNotificatorAdminNavTitle");
				
				kloudspeaker.service.get("events/types/").done(function(t) {
					that._events = [];
					that._eventTexts = t;
					for (var k in t) {
						if (t[k])
							that._events.push(k);
					}
				});
			}

			this.onActivate = function($c) {
				var list = false;
				var listView = false;
				that._details = kloudspeaker.ui.controls.slidePanel($("#kloudspeaker-mainview-viewcontent"), { resizable: true });
							
				var updateList = function() {
					that._cv.showLoading(true);
					kloudspeaker.service.get("notificator/list/").done(function(l) {
						list = l;
						listView.table.set(list);
						that._cv.showLoading(false);
					});
				};
	
				listView = new kloudspeaker.view.ConfigListView($c, {
					actions: [
						{ id: "action-add", content:'<i class="fa fa-plus"></i>', callback: function() { that.onAddEditNotification(false, updateList); }},
						{ id: "action-remove", content:'<i class="fa fa-trash"></i>', cls:"btn-danger", depends: "table-selection", callback: function(sel) { kloudspeaker.service.del("notificator/list/", { ids: kloudspeaker.helpers.extractValue(sel, "id") }).done(updateList); }},
						{ id: "action-refresh", content:'<i class="fa fa-refresh"></i>', callback: updateList }
					],
					table: {
						id: "plugin-notifications-list",
						key: "id",
						narrow: true,
						hilight: true,
						columns: [
							{ type:"selectrow" },
							{ id: "icon", title:"", type:"static", content: '<i class="fa fa-envelope-o"></i>' },
							{ id: "name", title: kloudspeaker.ui.texts.get('pluginNotificatorAdminNameTitle') },
							{ id: "id", title: kloudspeaker.ui.texts.get('configAdminTableIdTitle') },
							{ id: "edit", title: "", type: "action", content: '<i class="fa fa-edit"></i>' },
							{ id: "remove", title: "", type: "action", content: '<i class="fa fa-trash"></i>' }
						],
						onRowAction: function(id, n) {
							if (id == "remove") {
								kloudspeaker.service.del("notificator/list/"+n.id).done(updateList);
							} else if (id == "edit") {
								that.onAddEditNotification(n, updateList);
							}
						},
						onHilight: function(n) {
							if (n) {
								that._showNotificationDetails(n, that._details.getContentElement().empty());
								that._details.show(false, 400);
							} else {
								that._details.hide();
							}
						}
					}
				});
				updateList();
				
				$c.addClass("loading");
				var gp = kloudspeaker.service.get("configuration/usersgroups").done(function(ug) {
					that._allUsersgroups = ug.users.concat(ug.groups);
					that._usersByKey = kloudspeaker.helpers.mapByKey(that._allUsersgroups, "id");
				}).done(function(){$c.removeClass("loading");});
			};
			
			this.onDeactivate = function() {
				that._details.remove();
			};
			
			this._getUsers = function(ids) {
				var result = [];
				$.each(ids, function(i, id) {
					result.push(that._usersByKey[id]);
				});
				return result;
			}
			
			this.onAddEditNotification = function(n, cb) {
				kloudspeaker.ui.dialogs.input({
					resizable: true,
					initSize: [600, 400],
					title: kloudspeaker.ui.texts.get(n ? 'pluginNotificationAdminEditNotificationTitle' : 'pluginNotificationAdminAddNotificationTitle'),
					message: kloudspeaker.ui.texts.get(n ? 'pluginNotificationAdminEditNotificationMessage' : 'pluginNotificationAdminAddNotificationMessage'),
					yesTitle: kloudspeaker.ui.texts.get('dialogSave'),
					noTitle: kloudspeaker.ui.texts.get('dialogCancel'),
					defaultValue: n ? n.name : "",
					handler: {
						isAcceptable : function(name) {
							if (!name || name.length === 0) return false;
							if (n && name == n.name) return false;
							return true;
						},
						onInput: function(name) {
							if (n)
								kloudspeaker.service.put("notificator/list/"+n.id, {name:name}).done(cb);
							else
								kloudspeaker.service.post("notificator/list/", {name:name}).done(cb);
						}
					}
				});
			}
			
			this._showNotificationDetails = function(n, $e) {
				kloudspeaker.templates.load("plugin-notification-content", kloudspeaker.helpers.noncachedUrl(kloudspeaker.plugins.adminUrl("Notificator", "content.html"))).done(function() {
					kloudspeaker.dom.template("kloudspeaker-tmpl-plugin-notificator-notificationdetails", {notification: n}).appendTo($e);
					kloudspeaker.ui.process($e, ["localize"]);
					
					var nd = false;
					var $title = $e.find(".kloudspeaker-notificator-notificationdetails-messagetitle");
					var $msg = $e.find(".kloudspeaker-notificator-notificationdetails-message");
					var $events = $e.find(".kloudspeaker-notificator-notificationdetails-events");
					var $eventUsersgroups = $e.find(".kloudspeaker-notificator-notificationdetails-eventusersgroups");
					var $usersgroups = $e.find(".kloudspeaker-notificator-notificationdetails-usersgroups");
					var eventsView = false;
					var eventUsersgroupsView = false;
					var usersgroupsView = false;
					
					var update = function() {
						$e.addClass("loading");
						kloudspeaker.service.get("notificator/list/"+n.id).done(function(r) {
							$e.removeClass("loading");
							nd = r;
							
							$title.text(nd.message_title);
							$msg.text(nd.message);
							eventsView.table.set(nd.events);
							eventUsersgroupsView.table.set(nd.users);
							usersgroupsView.table.set(that._getUsers(nd.recipients));
						});
					};
					var onAddEvents = function() {
						var currentEvents = nd.events;
						var selectable = kloudspeaker.helpers.filter(that._events, function(e) { return nd.events.indexOf(e) < 0; });
						if (selectable.length === 0) return;
		
						kloudspeaker.ui.dialogs.select({
							title: kloudspeaker.ui.texts.get('pluginNotificatorNotificationAddEventTitle'),
							message: kloudspeaker.ui.texts.get('pluginNotificatorNotificationAddEventMessage'),
							initSize: [600, 400],
							columns: [
								{ id: "icon", title:"", type:"static", content: '<i class="fa fa-folder"></i>' },
								{ id: "id", title: kloudspeaker.ui.texts.get('configAdminTableIdTitle'), valueMapper: function(i) { return i; } }
							],
							list: selectable,
							onSelect: function(sel, o) {
								var folders = [];
								$.each(sel, function(i, f) {
									var folder = {id: f.id};
									var name = o[f.id] ? o[f.id].user_name : false;
									if (name && f.name != name)
											folder.name = name;
									folders.push(folder);
								});
								kloudspeaker.service.put("notificator/list/"+nd.id, {events: sel}).done(update);
							}
						});
					};
					var onAddUsersgroups = function() {
						var selectable = kloudspeaker.helpers.filter(that._allUsersgroups, function(f) { return nd.recipients.indexOf(f.id) < 0; });
						if (selectable.length === 0) return;
		
						kloudspeaker.ui.dialogs.select({
							title: kloudspeaker.ui.texts.get('pluginNotificatorNotificationAddUserTitle'),
							message: kloudspeaker.ui.texts.get('pluginNotificatorNotificationAddUserMessage'),
							key: "id",
							initSize: [600, 400],
							columns: [
								{ id: "icon", title:"", valueMapper: function(i, v) { if (i.is_group == 1) return "<i class='fa fa-group'></i>"; return "<i class='fa fa-user'></i>"; } },
								{ id: "id", title: kloudspeaker.ui.texts.get('configAdminTableIdTitle') },
								{ id: "name", title: kloudspeaker.ui.texts.get('configAdminUserDialogUsernameTitle') }
							],
							list: selectable,
							onSelect: function(sel, o) {
								kloudspeaker.service.put("notificator/list/"+nd.id, {recipients: nd.recipients.concat(kloudspeaker.helpers.extractValue(sel, "id"))}).done(update);
							}
						});
					};

					var onAddEventUsersgroups = function() {
						var userIds = kloudspeaker.helpers.extractValue(nd.users, "id");
						var selectable = kloudspeaker.helpers.filter(that._allUsersgroups, function(f) { return userIds.indexOf(f.id) < 0; });
						if (selectable.length === 0) return;
		
						kloudspeaker.ui.dialogs.select({
							title: kloudspeaker.ui.texts.get('pluginNotificatorNotificationAddEventUserTitle'),
							message: kloudspeaker.ui.texts.get('pluginNotificatorNotificationAddEventUserMessage'),
							key: "id",
							initSize: [600, 400],
							columns: [
								{ id: "icon", title:"", valueMapper: function(i, v) { if (i.is_group == 1) return "<i class='fa fa-group'></i>"; return "<i class='fa fa-user'></i>"; } },
								{ id: "id", title: kloudspeaker.ui.texts.get('configAdminTableIdTitle') },
								{ id: "name", title: kloudspeaker.ui.texts.get('configAdminUserDialogUsernameTitle') }
							],
							list: selectable,
							onSelect: function(sel, o) {
								kloudspeaker.service.put("notificator/list/"+nd.id, {users: userIds.concat(kloudspeaker.helpers.extractValue(sel, "id"))}).done(update);
							}
						});
					};
					
					var onEditFilters = function(event, cb) {
						var filterData = {
							"new": [],
							"removed": []
						};
						var $content = false;
						
						var getAvailableFilters = function() {
							var result = [];
							$.each(availableFilters, function(i, f) {
								if (!new RegExp(f.events, "gi").test(event.type)) return;
								result = result.concat(f.filters);
							});
							return result;
						};
						var addFilterIfValid = false;
						
						kloudspeaker.ui.dialogs.custom({
							resizable: true,
							initSize: [600, 400],
							title: kloudspeaker.ui.texts.get('pluginNotificatorNotificationEditEventFilters'),
							content: kloudspeaker.dom.template("kloudspeaker-tmpl-notificator-filtereditor", {event: event}),
							buttons: [
								{ id: "yes", cls:"btn-primary", "title": kloudspeaker.ui.texts.get('dialogSave') },
								{ id: "no", "title": kloudspeaker.ui.texts.get('dialogCancel') }
							],
							"on-button": function(btn, d) {
								if (btn.id == 'no') {
									d.close();
									return;
								}
								addFilterIfValid();
								if (filterData["new"].length === 0 && filterData.removed.length === 0)
									return;
								
								$content.addClass("loading");
								kloudspeaker.service.put("notificator/list/"+nd.id+"/events/"+event.id+"/filters/", filterData).done(d.close).done(cb).fail(d.close);
							},
							"on-show": function(h, $d) {
								$content = $d.find("#kloudspeaker-notificator-filtereditor-content");
			
								h.center();
								$content.removeClass("loading");
								
								var $list = kloudspeaker.ui.controls.table("kloudspeaker-notificator-filtereditor-list", {
									key: "id",
									columns: [
										{ id: "id", title: kloudspeaker.ui.texts.get('configAdminTableIdTitle')},
										{ id: "type", title: kloudspeaker.ui.texts.get('pluginNotificatorNotificationEditEventFiltersType'), valueMapper: function(i, v) {
											return kloudspeaker.ui.texts.get('pluginNotificatorEventFilterType_'+v);
										} },
										{ id: "value", title: kloudspeaker.ui.texts.get('pluginNotificatorNotificationEditEventFiltersValue'), valueMapper: function(i, v) {
											if (!filterEditors[filterEditorTypes[i.type]]) return "-";
											return filterEditors[filterEditorTypes[i.type]].getVisibleValue(i.value);
										} },
										{ id: "remove", title: "", type:"action", content: kloudspeaker.dom.template("kloudspeaker-tmpl-notificator-filtereditor-listremove").html() }
									],
									onRowAction: function(id, f) {
										if (!f.isnew) filterData.removed.push(f);
										$list.remove(f);
									}
								});
								$list.add(event.filters);
								
								var editor = false;
								var $newType = kloudspeaker.ui.controls.select("kloudspeaker-notificator-filtereditor-new-type", {
									none: {title: kloudspeaker.ui.texts.get('pluginNotificatorNotificationEditEventFiltersSelect')},
									formatter: function(i) {
										return kloudspeaker.ui.texts.get('pluginNotificatorEventFilterType_'+i);
									},
									onChange: function(nf) {
										clearNewEditor(true);
										if (nf && filterEditors[filterEditorTypes[nf]]) {
											editor = filterEditors[filterEditorTypes[nf]].init($("#kloudspeaker-notificator-filtereditor-new-value"), onEditorValueChanged);
										}
									}
								});
								$newType.add(getAvailableFilters());
								var clearNewEditor = function(noType) {
									if (!noType) $newType.select(null);
									$("#kloudspeaker-notificator-filtereditor-new-value").empty();
									$("#kloudspeaker-notificator-filtereditor-new-add").addClass("disabled");
									editor = false;
								};
								var onEditorValueChanged = function() {
									var ok = (editor && editor.hasValue());
									if (ok) $("#kloudspeaker-notificator-filtereditor-new-add").removeClass("disabled");
									else $("#kloudspeaker-notificator-filtereditor-new-add").addClass("disabled");
								};
								
								addFilterIfValid = function() {
									var selectedFilter = $newType.selected();
									if (!selectedFilter) return;
									if (!editor || !editor.hasValue()) return;
									
									var newFilter = {type: selectedFilter, value: editor.getValue(), isnew: true};
									filterData.new.push(newFilter);
									$list.add(newFilter);
									clearNewEditor();
								};
								$("#kloudspeaker-notificator-filtereditor-new-add").click(addFilterIfValid);
								clearNewEditor();
							}
						});
					};
							
					eventsView = new kloudspeaker.view.ConfigListView($events, {
						title: kloudspeaker.ui.texts.get('pluginNotificatorNotificationEventsTitle'),
						actions: [
							{ id: "action-add", content:'<i class="fa fa-plus"></i>', callback: onAddEvents },
							{ id: "action-remove", content:'<i class="fa fa-trash"></i>', cls:"btn-danger", depends: "table-selection", callback: function(sel) {
								kloudspeaker.service.del("notificator/list/"+nd.id+"/events/", { ids: kloudspeaker.helpers.extractValue(sel, "id") }).done(update);
							}}
						],
						table: {
							id: "plugin-notificator-notificationevents",
							narrow: true,
							columns: [
								{ type:"selectrow" },
								{ id: "icon", title:"", type:"static", content: '<i class="fa fa-folder"></i>' },
								{ id: "type", title: kloudspeaker.ui.texts.get('pluginNotificatorAdminEventTypeTitle') },
								{ id: "filter", title: kloudspeaker.ui.texts.get('pluginNotificatorAdminEventFilterTitle'), valueMapper: function(i, v) { return (i.filters && i.filters.length > 0) ? i.filters.length : ""; } },
								{ id: "set_filter", title: "", type: "action", content: '<i class="fa fa-filter"></i>' },
								{ id: "remove", title: kloudspeaker.ui.texts.get('configAdminActionRemoveTitle'), type: "action", content: '<i class="fa fa-trash"></i>' }
							],
							onRowAction: function(id, e) {
								if (id == "remove") {
									kloudspeaker.service.del("notificator/list/"+nd.id+"/events/", { ids: [e.id] }).done(update);
								} else if (id == "set_filter") {
									onEditFilters(e, update);
								}
							}
						}
					});

					eventUsersgroupsView = new kloudspeaker.view.ConfigListView($eventUsersgroups, {
						title: kloudspeaker.ui.texts.get('pluginNotificatorNotificationEventUsersTitle'),
						actions: [
							{ id: "action-add", content:'<i class="fa fa-plus"></i>', callback: onAddEventUsersgroups },
							{ id: "action-remove", content:'<i class="fa fa-trash"></i>', cls:"btn-danger", depends: "table-selection", callback: function(sel) {
								kloudspeaker.service.del("notificator/list/"+nd.id+"/users/", { ids: kloudspeaker.helpers.extractValue(sel, "id") }).done(update);
							}}
						],
						table: {
							id: "plugin-notificator-notificationeventusers",
							key: "id",
							narrow: true,
							emptyHint: kloudspeaker.ui.texts.get('pluginNotificatorNotificationNoEventUsersMsg'),
							columns: [
								{ type:"selectrow" },
								{ id: "icon", title:"", valueMapper: function(i, v) { if (i.is_group == 1) return "<i class='fa fa-group'></i>"; return "<i class='fa fa-user'></i>"; } },
								{ id: "id", title: kloudspeaker.ui.texts.get('configAdminTableIdTitle') },
								{ id: "name", title: kloudspeaker.ui.texts.get('configAdminUserDialogUsernameTitle') },
								{ id: "remove", title: "", type: "action", content: '<i class="fa fa-trash"></i>' }
							],
							onRowAction: function(id, g) {
								if (id == "remove") {
									kloudspeaker.service.del("notificator/list/"+nd.id+"/users/", { ids: [g.id] }).done(update);
								}
							}
						}
					});
							
					usersgroupsView = new kloudspeaker.view.ConfigListView($usersgroups, {
						title: kloudspeaker.ui.texts.get('pluginNotificatorNotificationUsersTitle'),
						actions: [
							{ id: "action-add", content:'<i class="fa fa-plus"></i>', callback: onAddUsersgroups },
							{ id: "action-remove", content:'<i class="fa fa-trash"></i>', cls:"btn-danger", depends: "table-selection", callback: function(sel) {
								kloudspeaker.service.del("notificator/list/"+nd.id+"/recipients/", { ids: kloudspeaker.helpers.extractValue(sel, "id") }).done(update);
							}}
						],
						table: {
							id: "plugin-notificator-notificationusers",
							key: "id",
							narrow: true,
							columns: [
								{ type:"selectrow" },
								{ id: "icon", title:"", valueMapper: function(i, v) { if (i.is_group == 1) return "<i class='fa fa-user'></i><i class='fa fa-user'></i>"; return "<i class='fa fa-user'></i>"; } },
								{ id: "id", title: kloudspeaker.ui.texts.get('configAdminTableIdTitle') },
								{ id: "name", title: kloudspeaker.ui.texts.get('configAdminUserDialogUsernameTitle') },
								{ id: "remove", title: "", type: "action", content: '<i class="fa fa-trash"></i>' }
							],
							onRowAction: function(id, r) {
								if (id == "remove") {
									kloudspeaker.service.del("notificator/list/"+nd.id+"/recipients/", { ids: [r.id] }).done(update);
								}
							}
						}
					});
					$(".kloudspeaker-notificator-notificationdetails-editmessage").click(function() { that.onEditMessage(nd, update); } );
					
					update();
				});
			}

			this.onEditMessage = function(n, cb) {
				var $content = false;
				var $title = false;
				var $message = false;
				
				kloudspeaker.ui.dialogs.custom({
					resizable: true,
					initSize: [600, 400],
					title: kloudspeaker.ui.texts.get('pluginNotificatorNotificationEditMessageDialogTitle'),
					content: kloudspeaker.dom.template("kloudspeaker-tmpl-notificator-editmessage", {notification: n}),
					buttons: [
						{ id: "yes", "title": kloudspeaker.ui.texts.get('dialogSave') },
						{ id: "no", "title": kloudspeaker.ui.texts.get('dialogCancel') }
					],
					"on-button": function(btn, d) {
						if (btn.id == 'no') {
							d.close();
							return;
						}
						kloudspeaker.service.put("notificator/list/"+n.id, {message_title: $title.val(), message: $message.val()}).done(d.close).done(cb);
					},
					"on-show": function(h, $d) {
						$content = $d.find("#kloudspeaker-notificator-editmessage-dialog");
						$title = $d.find("#titleField");
						$message = $d.find("#messageField");
						
						$title.val(n.message_title);
						$message.val(n.message);
						
						$title.focus();
	
						h.center();
					}
				});
			}	
		}
	}

	kloudspeaker.admin.plugins.Notificator = {
		resources : {},
		views: [
			new kloudspeaker.view.config.admin.Notificator.NotificationsView()
		]
	};
}(window.jQuery, window.kloudspeaker);
