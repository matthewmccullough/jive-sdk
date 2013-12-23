/*
 * Copyright 2013 Jive Software
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

/**
 * API for managing system events.
 * @class events
 */

///////////////////////////////////////////////////////////////////////////////////
// private

var events = require('events');
var jive = require('../../api');
var pusher = require('../tile/dataPusher');
var comments = require('../tile/comments');
var regHandler = require('../tile/registration.js');

///////////////////////////////////////////////////////////////////////////////////
// public

exports = module.exports = new events.EventEmitter();

exports.eventHandlerMap = {};

/**
 * Add a user contributed event handler. The handler is added to an array of handler functions assigned for the
 * event listener. Only one function per event listener per event is permitted.
 * @memberof events
 * @param {String} event - the event id
 * @param {String} eventListener - the name of the listener
 * @param {function} handler - the function to call
 * @param {String} description
 */
exports.addDefinitionEventListener = function( event, eventListener, handler, description ) {
    jive.logger.debug("Registered event for", eventListener,": '" + event + "' ", description ||'' );

    if ( !exports.eventHandlerMap[eventListener] ) {
        exports.eventHandlerMap[eventListener] = {};
    }

    if (!exports.eventHandlerMap[eventListener][event]) {
        exports.eventHandlerMap[eventListener][event] = [];
    }

    // duplicate definition event listeners aren't permitted
    if ( exports.eventHandlerMap[eventListener][event].indexOf(handler) == - 1 ) {
        exports.eventHandlerMap[eventListener][event].push( handler );
    } else {
        jive.logger.warn("Event",event,"eventListener",eventListener,"already exists; ignoring event listener add.");
    }
};

/**
 * Returns array of event handling functions for the given eventListener and event, if at least one was registered.
 * Otherwise returns undefined.
 * @memberof events
 * @param {String} eventListener
 * @param {String} event
 * @returns {Array}
 */
exports.getDefinitionEventListenerFor = function( eventListener, event ) {
    if ( !exports.eventHandlerMap[eventListener] || !exports.eventHandlerMap[eventListener][event] ) {
        return null;
    }

    return exports.eventHandlerMap[eventListener][event];
};

/**
 * Adds a system-level event listener.
 * @memberof events
 * @param {String} event
 * @param {function} handler
 * @param description
 */
exports.addSystemEventListener = function(event, handler, description) {
    jive.logger.debug("Registered system event ", event,": ", description || 'no description');

    if (!exports.eventHandlerMap[event]) {
        exports.eventHandlerMap[event] = [];
    }

    // duplicate system event listeners are permitted, tile-contributed
    // system event handlers
    exports.eventHandlerMap[event].push( handler );
};

/**
 * Adds a local event handler.
 * @memberof events
 * @param {String} event
 * @param {function} handler
 */
exports.addLocalEventListener = function( event, handler ) {
    exports.addListener( event, function(context) {
        return handler(context, event);
    } );
};

/**
 * There are events that pusher nodes are allowed to handle.
 * @memberof events
 * @type {Array}
 */
exports.pushQueueEvents = [
    jive.constants.tileEventNames.PUSH_DATA_TO_JIVE,
    jive.constants.tileEventNames.PUSH_ACTIVITY_TO_JIVE,
    jive.constants.tileEventNames.PUSH_COMMENT_TO_JIVE
];

/**
 * Array of system defined events.
 * @memberof events
 * @type {Array}
 */
exports.globalEvents = [
    jive.constants.globalEventNames.NEW_INSTANCE,
    jive.constants.globalEventNames.INSTANCE_UPDATED,
    jive.constants.globalEventNames.INSTANCE_REMOVED,
    jive.constants.globalEventNames.DATA_PUSHED,
    jive.constants.globalEventNames.ACTIVITY_PUSHED,
    jive.constants.globalEventNames.COMMENT_PUSHED,
    jive.constants.globalEventNames.CLIENT_APP_REGISTRATION_SUCCESS,
    jive.constants.globalEventNames.CLIENT_APP_REGISTRATION_FAILED
];

/**
 * This is an array of system defined events
 * @memberof events
 * @type {Array}
 */
exports.baseEvents = [
    {
        'event': jive.constants.globalEventNames.NEW_INSTANCE,
        'handler' : function(context){
            jive.logger.info("A new instance was created", context);
        },
        'description' : 'Framework handler'
    },
    {
        'event': jive.constants.globalEventNames.INSTANCE_UPDATED,
        'handler' : function(context){
            jive.logger.info("An instance was updated", context);
        },
        'description' : 'Framework handler'
    },
    {
        'event': jive.constants.globalEventNames.INSTANCE_REMOVED,
        'handler' : function(context){
            jive.logger.info("Instance has been destroyed", context);
        },
        'description' : 'Framework handler'
    },
    {
        'event': jive.constants.globalEventNames.DATA_PUSHED,
        'handler' : function(context){
            var theInstance = context['theInstance'], pushedData = context['pushedData'], response = context['response'];
            jive.logger.info('Data push to', theInstance.url, response ? response.statusCode : '', theInstance.name);
        },
        'description' : 'Framework handler'
    },
    {
        'event': jive.constants.globalEventNames.ACTIVITY_PUSHED,
        'handler' : function(context){
            var theInstance = context['theInstance'], pushedData = context['pushedData'], response = context['response'];
            jive.logger.info('Activity push to', theInstance.url, response ? response.statusCode : '', theInstance.name);
        },
        'description' : 'Framework handler'
    },
    {
        'event': jive.constants.globalEventNames.COMMENT_PUSHED,
        'handler' : function(context){
            var theInstance = context['theInstance'], pushedData = context['pushedData'], response = context['response'];
            jive.logger.info('Comment push to', theInstance.url, response ? response.statusCode : '', theInstance.name);
        },
        'description' : 'Framework handler'
    },

    {
        'event':jive.constants.tileEventNames.PUSH_DATA_TO_JIVE,
        'handler':function(context) {
            var tileInstance = context['tileInstance'];
            var data = context['data'];
            return pusher.pushData(tileInstance, data);
        },
        'description' : 'Framework handler'
    },
    {
        'event':jive.constants.tileEventNames.PUSH_ACTIVITY_TO_JIVE,
        'handler':function(context) {
            var tileInstance = context['tileInstance'];
            var activity = context['activity'];
            return pusher.pushActivity(tileInstance, activity);
        },
        'description' : 'Framework handler'
    },
    {
        'event':jive.constants.tileEventNames.PUSH_COMMENT_TO_JIVE,
        'handler':function(context) {
            var tileInstance = context['tileInstance'];
            var commentURL = context['commentsURL'];
            var comment = context['comment'];
            return pusher.pushComment(tileInstance, commentURL, comment);
        },
        'description' : 'Framework handler'
    },
    {
        'event':jive.constants.tileEventNames.COMMENT_ON_ACTIVITY,
        'handler':function(context) {
            var activity = context['activity'];
            var comment = context['comment'];
            return comments.commentOnActivity( activity, comment);
        },
        'description' : 'Framework handler'
    },
    {
        'event':jive.constants.tileEventNames.COMMENT_ON_ACTIVITY_BY_EXTERNAL_ID,
        'handler':function(context) {
            var extstream = context['extstream'];
            var externalActivityID = context['externalActivityID'];
            var comment = context['comment'];
            return comments.commentOnActivityByExternalID( extstream, externalActivityID, comment );
        },
        'description' : 'Framework handler'
    },
    {
        'event':jive.constants.tileEventNames.FETCH_COMMENTS_ON_ACTIVITY,
        'handler':function(context) {
            var activity = context['activity'];
            var opts = context['opts'];
            return comments.fetchCommentsOnActivity( activity, opts );
        },
        'description' : 'Framework handler'
    },
    {
        'event':jive.constants.tileEventNames.FETCH_ALL_COMMENTS_FOR_EXT_STREAM,
        'handler':function(context) {
            var extstream = context['extstream'];
            var opts = context['opts'];
            return comments.fetchAllCommentsForExtstream( extstream, opts );
        },
        'description' : 'Framework handler'
    },
    {
        'event':jive.constants.tileEventNames.INSTANCE_REGISTRATION,
        'handler':function(context) {
            return regHandler.registration(context);
        }
    },
    {
        'event':jive.constants.tileEventNames.INSTANCE_UNREGISTRATION,
        'handler':function(context) {
            return regHandler.unregistration(context);
        }
    },
    {
        'event':jive.constants.tileEventNames.CLIENT_APP_REGISTRATION,
        'handler':function(context) {
            return jive.community.register(context);
        },
        'description' : 'Framework handler'
    },
    {
        'event': jive.constants.tileEventNames.GET_PAGINATED_RESULTS,
        'handler':function(context) {
            return pusher.getPaginated( context['extstream'], context['commentsURL'] );
        },
        'description' : 'Framework handler'
    },
    {
        'event': jive.constants.tileEventNames.GET_EXTERNAL_PROPS,
        'handler':function(context) {
            return pusher.fetchExtendedProperties( context['instance'] );
        },
        'description' : 'Framework handler'
    },
    {
        'event': jive.constants.tileEventNames.SET_EXTERNAL_PROPS,
        'handler':function(context) {
            return pusher.pushExtendedProperties( context['instance'], context['props'] );
        },
        'description' : 'Framework handler'
    },
    {
        'event': jive.constants.tileEventNames.DELETE_EXTERNAL_PROPS,
        'handler':function(context) {
            return pusher.removeExtendedProperties( context['instance'] );
        },
        'description' : 'Framework handler'
    }
];

/**
 * Removes all event handlers.
 * @memberof events
 */
exports.reset = function() {
    exports.eventHandlerMap = {};
    exports.removeAllListeners();
};
