
var dbconnect = {
	/**
	 * this variable holds the db object.
	 */
	db : this.db,
	/**
	 * setup function to set up the db on the browser client.
	 */
	setup : function() {
		//open database and create it if it's not exist
		dbconnect.db = openDatabase('dbname', '1.0',
				'To do list extension database', 5 * 1024 * 1024);
		//creates the tables if they are not exist.
		dbconnect.db
				.transaction(function(tx) {
					tx
							.executeSql(
									"create table if not exists "
											+ "tasklist(id integer primary key asc, title string, content string,"
											+ "startdate string,time string, enddate string, reminder string, priority string, expired boolean, gcalurl string,"
											+ "reminder_type string, remind_until string);",
									[], function() {
										console.log("tasklist created");
									});
				});
		dbconnect.db
				.transaction(function(tx) {
					tx
							.executeSql(
									"create table if not exists "
											+ "reminder(id integer primary key asc, taskid string, date string,time string);",
									[], function() {
										console.log("reminder created");
									});
				});
	},
	/**
	 * save object to the db ( simple dao function to save object). just like the jdbc in java with the native code for the sql engine.
	 * @param task: the object to save.
	 * @param handler: the function to execute after saving.
	 */
	save : function(task, handler) {
		//saving the object with the custom sql string to execute in the transaction.
		//also do the logic based on saving the object.
		dbconnect.db
				.transaction(function(tx) {
					tx
							.executeSql(
									"insert into tasklist (title, content, startdate,time, enddate, reminder, priority, expired, gcalurl,reminder_type,remind_until) values (?,?,?,?,?,?,?,?,?,?,?);",
									[ task.title, task.content, task.startdate,
											task.time, task.enddate,
											task.reminder, task.priority,
											task.expired, '',
											task.reminderType, task.until ],
									function() {
										dbconnect
												.lastAdd(function(id) {
													var untilDate = util
															.Date(task.until);
													var nextDay = util
															.Date(task.startdate);
													var dates = [];
													switch (task.reminderType) {
													case 'none': {
														if (task.reminder
																&& task.reminder != '') {
															dbconnect
																	.addReminders(
																			id,
																			[ util
																					.dateString(nextDay) ],
																			task.reminder,
																			function() {
																				chrome.extension
																						.getBackgroundPage().bg
																						.checkTodaysReminders();
																			});
														}
														break;
													}
													case 'daily': {
														while (nextDay
																.getTime() != untilDate
																.getTime()) {
															dates
																	.push(util
																			.dateString(nextDay));
															nextDay = util
																	.nextDay(nextDay);
														}
														dbconnect
																.addReminders(
																		id,
																		dates,
																		task.reminder,
																		function() {
																			chrome.extension
																					.getBackgroundPage().bg
																					.checkTodaysReminders();
																		});
														break;
													}
													case 'weekly': {
														while (nextDay
																.getTime() <= untilDate
																.getTime()) {
															dates
																	.push(util
																			.dateString(nextDay));
															nextDay = util
																	.nextWeek(nextDay);
														}
														dbconnect
																.addReminders(
																		id,
																		dates,
																		task.reminder,
																		function() {
																			chrome.extension
																					.getBackgroundPage().bg
																					.checkTodaysReminders();
																		});
														break;
													}
													case 'monthly': {
														while (nextDay
																.getTime() <= untilDate
																.getTime()) {
															dates
																	.push(util
																			.dateString(nextDay));
															nextDay = util
																	.nextMonth(nextDay);
														}
														dbconnect
																.addReminders(
																		id,
																		dates,
																		task.reminder,
																		function() {
																			chrome.extension
																					.getBackgroundPage().bg
																					.checkTodaysReminders();
																		});
														break;
													}
													case 'yearly': {
														while (nextDay
																.getTime() <= untilDate
																.getTime()) {
															dates
																	.push(util
																			.dateString(nextDay));
															nextDay = util
																	.nextYear(nextDay);
														}
														dbconnect
																.addReminders(
																		id,
																		dates,
																		task.reminder,
																		function() {
																			chrome.extension
																					.getBackgroundPage().bg
																					.checkTodaysReminders();
																		});
														break;
													}
													default: {
														break;
													}
													}
													//run the handler function and giving it the id.
													handler(id);
												});
									}, dbconnect.onError);
				});
	},
	/**
	 * get the last added id in the db.
	 * @param handler: function to execute after the sql run.
	 */
	lastAdd : function(handler) {
		var matchingTasks = [];
		dbconnect.db.transaction(function(tx) {
			tx.executeSql("SELECT max (id) as id FROM  tasklist ;", [],
					function(tx, results) {
						for (var i = 0; i < results.rows.length; i++) {
							matchingTasks
									.push(util.clone(results.rows.item(i)));
						}
						handler(matchingTasks[0].id);
					}, dbconnect.onError);
		});
	},
	setGoogleCalendarURL : function(taskId, gcurl, handler) {
		dbconnect.db.transaction(function(tx) {
			tx.executeSql("UPDATE tasklist set gcalurl= ? WHERE id= ?;", [
					gcurl, taskId ], handler, dbconnect.onError);
		});
	},
	drop : function(table) {
		dbconnect.db.transaction(function(tx) {
			tx.executeSql("drop table " + table + ";", [], function() {
				console.log("dropped");
			});
		});
	},
	addreminder : function(task, date, time, handler) {
		dbconnect.db.transaction(function(tx) {
			tx.executeSql(
					"insert into reminder (taskid, date,time) values (?,?,?);",
					[ task, date, time ], handler, dbconnect.onError);
		});
	},
	addReminders : function(taskid, dates, time, handler) {
		dbconnect.db
				.transaction(function(tx) {
					for (var i = 0; i < dates.length; i++) {
						tx
								.executeSql(
										"insert into reminder (taskid, date,time) values (?,?,?)",
										[ taskid, dates[i], time ],
										(i == dates.length - 1 ? handler : null),
										dbconnect.onError);
					}
				});
	},
	update : function(task, handler) {
		dbconnect.db
				.transaction(function(tx) {
					tx
							.executeSql(
									"UPDATE tasklist set title=? ,content=? ,startdate=?, time=? ,enddate=? ,reminder=?  ,priority=? ,expired=? WHERE id= ?;",
									[ task.title, task.content, task.startdate,
											task.time, task.enddate,
											task.reminder, task.priority,
											task.expired, task.id ], handler,
									dbconnect.onError);
				});
	},
	deleteRec : function(taskids, handler) {
		dbconnect.db.transaction(function(tx) {
			for ( var i = 0; i < taskids.length; i++) {
				tx.executeSql("DELETE FROM tasklist WHERE id=?;",
						[ taskids[i] ], null, dbconnect.onError);
				tx.executeSql("DELETE FROM reminder WHERE taskid=?;",
						[ taskids[i] ], (i == taskids.length - 1 ? handler
								: null), dbconnect.onError);
			}
		});
	},
	markAsDone : function(ids, handler) {
		dbconnect.db.transaction(function(tx) {
			for ( var i = 0; i < ids.length; i++) {
				tx.executeSql("UPDATE tasklist set expired= ? WHERE id= ?;", [
						true, ids[i] ], null, dbconnect.onError);
				tx.executeSql("DELETE FROM reminder WHERE taskid=?;",
						[ ids[i] ], (i == ids.length - 1 ? handler : null),
						dbconnect.onError);
			}

		});
	},
	searchByTitle : function(title, handler) {
		var matchingTasks = [];
		dbconnect.db.transaction(function(tx) {
			tx.executeSql("SELECT * FROM tasklist WHERE title like(?);", [ '%'
					+ title + '%' ], function(tx, results) {
				for (var i = 0; i < results.rows.length; i++) {
					matchingTasks.push(util.clone(results.rows.item(i)));
				}
				handler(matchingTasks);
			}, dbconnect.onError);
		});
	},
	searchByStartDate : function(date, handler) {
		var matchingTasks = [];
		dbconnect.db.transaction(function(tx) {
			tx.executeSql("SELECT * FROM tasklist WHERE startdate like(?);",
					[ '%' + date + '%' ], function(tx, results) {
						for (var i = 0; i < results.rows.length; i++) {
							matchingTasks
									.push(util.clone(results.rows.item(i)));
						}
						handler(matchingTasks);
					}, dbconnect.onError);
		});
	},
	getOldTasks : function(handler) {
		var date = util.today();
		var matchingTasks = [];
		dbconnect.db
				.transaction(function(tx) {
					tx.executeSql(
									"SELECT * FROM tasklist WHERE startdate < ? AND startdate != '';",
									[ date ],
									function(tx, results) {
										for (var i = 0; i < results.rows.length; i++) {
											matchingTasks
													.push(util
															.clone(results.rows
																	.item(i)));
										}
										handler(matchingTasks);
									}, dbconnect.onError);
				});
	},
	completedOldTasks : function(handler, completed) {
		var date = util.today();
		var matchingTasks = [];
		dbconnect.db
				.transaction(function(tx) {
					tx
							.executeSql(
									"SELECT * FROM tasklist WHERE startdate < ? AND expired=? AND startdate != '';",
									[ date, completed ],
									function(tx, results) {
										for (var i = 0; i < results.rows.length; i++) {
											matchingTasks
													.push(util
															.clone(results.rows
																	.item(i)));
										}
										handler(matchingTasks);
									}, dbconnect.onError);
				});
	},
	getUpcommingTasks : function(handler) {
		var date = util.tomorrow();
		var matchingTasks = [];
		dbconnect.db.transaction(function(tx) {
			tx.executeSql("SELECT * FROM tasklist WHERE startdate > ?;",
					[ date ], function(tx, results) {
						for (var i = 0; i < results.rows.length; i++) {
							matchingTasks
									.push(util.clone(results.rows.item(i)));
						}
						handler(matchingTasks);
					}, dbconnect.onError);
		});
	},
	getNodatedTasks : function(handler) {
		var matchingTasks = [];
		dbconnect.db.transaction(function(tx) {
			tx.executeSql("SELECT * FROM tasklist WHERE startdate == '' ;", [],
					function(tx, results) {
						for (var i = 0; i < results.rows.length; i++) {
							matchingTasks
									.push(util.clone(results.rows.item(i)));
						}
						handler(matchingTasks);
					}, dbconnect.onError);
		});
	},
	getTaskById : function(id, handler) {
		var matchingTasks = [];
		dbconnect.db.transaction(function(tx) {
			tx.executeSql("SELECT * FROM tasklist WHERE id = ?;", [ id ],
					function(tx, results) {
						for (var i = 0; i < results.rows.length; i++) {
							matchingTasks
									.push(util.clone(results.rows.item(i)));
						}
						handler(matchingTasks.length == 0 ? null
								: matchingTasks[0]);
					}, dbconnect.onError);
		});
	},
	todayLists : function(handler) {
		var todaystring = util.today();
		dbconnect.searchByStartDate(todaystring, handler);
	},
	tomorrowLists : function(handler) {
		var tomorrowstring = util.tomorrow();
		dbconnect.searchByStartDate(tomorrowstring, handler);
	},
	onError : function(tx, error) {
		console.log("Error occurred: ", error.message);
	},
	todaysReminders : function(handler) {
		var todaystring = util.today();
		var matchingTasks = [];
		dbconnect.db.transaction(function(tx) {
			tx.executeSql("SELECT * FROM reminder WHERE date = ? ;",
					[ todaystring ], function(tx, results) {
						for (var i = 0; i < results.rows.length; i++) {
							matchingTasks
									.push(util.clone(results.rows.item(i)));
						}
						handler(matchingTasks);
					}, dbconnect.onError);
		});
	},
	deleteReminder : function(id, handler) {
		dbconnect.db.transaction(function(tx) {
			tx.executeSql("DELETE FROM reminder WHERE id=?;", [ id ], handler,
					dbconnect.onError);
		});
	}
};
// dbconnect.setup();
