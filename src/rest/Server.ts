/**
 * Created by rtholmes on 2016-06-19.
 */

import restify = require('restify');

import Log from "../Util";
import RouteHandler from './RouteHandler';

/**
 * This configures the REST endpoints for the server.
 */
export default class Server {

    private port: number;
    private rest: restify.Server;

    constructor(port: number) {
        Log.info("Server::<init>( " + port + " )");
        this.port = port;
    }

    /**
     * Stops the server. Again returns a promise so we know when the connections have
     * actually been fully closed and the port has been released.
     *
     * @returns {Promise<boolean>}
     */
    public stop(): Promise<boolean> {
        Log.info('Server::close()');
        let that = this;
        return new Promise(function (fulfill) {
            that.rest.close(function () {
                fulfill(true);
            });
        });
    }

    /**
     * Starts the server. Returns a promise with a boolean value. Promises are used
     * here because starting the server takes some time and we want to know when it
     * is done (and if it worked).
     *
     * @returns {Promise<boolean>}
     */
    public start(): Promise<boolean> {
        let that = this;
        return new Promise(function (fulfill, reject) {
            try {
                Log.info('Server::start() - start');

                that.rest = restify.createServer({
                    name: 'insightUBC'
                });

		// Serves static files for the UI.
		that.rest.get("/public/.*", restify.serveStatic({
		    directory: __dirname
		}));

         that.rest.get('/scheduler', RouteHandler.getUIPage);
                // TODO: Implement stubbed keys here.
                that.rest.post('/query', restify.bodyParser(), RouteHandler.postQuery);
                that.rest.post('/roomswithindistance', restify.bodyParser(), RouteHandler.getRoomsWithinDistance);
                that.rest.get('/roomInfo', RouteHandler.getRoomInformation);
                that.rest.get('/courseInfo', RouteHandler.getCourseInformation);
                that.rest.post('/roomExplorer', restify.bodyParser(), RouteHandler.handleRoomExploration);
                that.rest.post('/courseExplorer', restify.bodyParser(), RouteHandler.handleCourseExploration);
                that.rest.post('/scheduleCourses', restify.bodyParser(), RouteHandler.handleCourseScheduling);
                // While on scheduler, lets make Posts.
                // for part 1
                // We want to retrieve all section sizes, departments, course numbers, instructors and titles.
                // Will do this in one call and then take the information to populate dropdowns.
                // for part 2
                // We want to retrieve all building names, room numbers, room-size, room type, furniture type, location
                // for both parts we can hard code the 'labels' and dynamically populate the lists based pre-determined queries.
                // Will do this in one call and then take the information to populate dropdowns.

                // Loads the homepage.
        // curl -is  http://localhost:4321/
		that.rest.get('/', RouteHandler.getHomepage);
                // Sends a dataset. Is idempotent and can create or update a dataset id.
                // curl localhost:4321/dataset/test --upload-file FNAME.zip
                that.rest.put('/dataset/:id', RouteHandler.putDataset);

                // Deletes a datset.
                that.rest.del('/dataset/:id', RouteHandler.deleteDataset);

                // Receives queries. Although these queries never change the server (and thus could be GETs)
                // they are formed by sending JSON bodies, which is not standard for normal GET requests.
                // curl -is -X POST -d '{ "key": "value" }' http://localhost:4321/query
                that.rest.post('/query', restify.bodyParser(), RouteHandler.postQuery);


                that.rest.listen(that.port, function () {
                    Log.info('Server::start() - restify listening: ' + that.rest.url);
                    fulfill(true);
                });

                that.rest.on('error', function (err: string) {
                    // catches errors in restify start; unusual syntax due to internal node not using normal exceptions here
                    Log.info('Server::start() - restify ERROR: ' + err);
                    reject(err);
                });
            } catch (err) {
                Log.error('Server::start() - ERROR: ' + err);
                reject(err);
            }

        });

    }
}
