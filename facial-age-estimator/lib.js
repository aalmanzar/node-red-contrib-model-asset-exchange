/*jshint -W069 */

const { createCanvas, Image } = require('canvas');

/**
 * This repository contains code to instantiate and deploy a facial age estimation model. The model detects faces in an image, extracts facial features for each face detected and finally predicts the age of each face. The model uses a coarse-to-fine strategy to perform multi-class classification and regression for age estimation. The input to the model is an image and the output is a list of estimated ages and bounding box coordinates of each face detected in the image. The format of the bounding box coordinates is [xmin, ymin, width, height]. The model is based on the SSR-Net model. The model files are hosted on IBM Cloud Object Storage. The code in this repository deploys the model as a web service in a Docker container. This repository was developed as part of the IBM Code Model Asset Exchange.
 * @class ModelAssetExchangeServer
 * @param {(string|object)} [domainOrOptions] - The project domain or options object. If object, see the object's optional properties.
 * @param {string} [domainOrOptions.domain] - The project domain
 * @param {object} [domainOrOptions.token] - auth token - object with value property and optional headerOrQueryName and isQuery properties
 */
var ModelAssetExchangeServer = (function(){
    'use strict';

    var request = require('request');
    var Q = require('q');

    function ModelAssetExchangeServer(options){
        var domain = (typeof options === 'object') ? options.domain : options;
        this.domain = domain ? domain : '';
        if(this.domain.length === 0) {
            throw new Error('Domain parameter must be specified as a string.');
        }
    }

    function mergeQueryParams(parameters, queryParameters) {
        if (parameters.$queryParameters) {
            Object.keys(parameters.$queryParameters)
                  .forEach(function(parameterName) {
                      var parameter = parameters.$queryParameters[parameterName];
                      queryParameters[parameterName] = parameter;
            });
        }
        return queryParameters;
    }

    /**
     * HTTP Request
     * @method
     * @name ModelAssetExchangeServer#request
     * @param {string} method - http method
     * @param {string} url - url to do request
     * @param {object} parameters
     * @param {object} body - body parameters / object
     * @param {object} headers - header parameters
     * @param {object} queryParameters - querystring parameters
     * @param {object} form - form data object
     * @param {object} deferred - promise object
     */
    ModelAssetExchangeServer.prototype.request = function(method, url, parameters, body, headers, queryParameters, form, deferred){
        var req = {
            method: method,
            uri: url,
            qs: queryParameters,
            headers: headers
        };
        if(Object.keys(form).length > 0) {
            req.formData = { image: { value: form.body, options: { filename: 'image.jpg' }}};
        }
        if(typeof(body) === 'object' && !(body instanceof Buffer)) {
            req.json = true;
        }
        request(req, function(error, response, body){
            if(error) {
                deferred.reject(error);
            } else {
                if(/^application\/(.*\\+)?json/.test(response.headers['content-type'])) {
                    try {
                        body = JSON.parse(body);
                    } catch(e) {}
                }
                if(response.statusCode === 204) {
                    deferred.resolve({ response: response });
                } else if(response.statusCode >= 200 && response.statusCode <= 299) {
                    deferred.resolve({ response: response, body: body });
                } else {
                    deferred.reject({ response: response, body: body });
                }
            }
        });
    };

/**
 * Return the metadata associated with the model
 * @method
 * @name ModelAssetExchangeServer#get_metadata
 * @param {object} parameters - method options and parameters
 */
ModelAssetExchangeServer.prototype.get_metadata = function(parameters){
    if(parameters === undefined) {
        parameters = {};
    }
    var deferred = Q.defer();
    var domain = this.domain,  path = '/model/metadata';
    var body = {}, queryParameters = {}, headers = {}, form = {};

        headers['Accept'] = ['application/json'];
        headers['Content-Type'] = ['application/json'];

    queryParameters = mergeQueryParams(parameters, queryParameters);

    this.request('GET', domain + path, parameters, body, headers, queryParameters, form, deferred);

    return deferred.promise;
 };
/**
 * Make a prediction given input data
 * @method
 * @name ModelAssetExchangeServer#predict
 * @param {object} parameters - method options and parameters
     * @param {file} parameters.body - This repository contains code to instantiate and deploy a facial age estimation model. The model detects faces in an image, extracts facial features for each face detected and finally predicts the age of each face. The model uses a coarse-to-fine strategy to perform multi-class classification and regression for age estimation. The input to the model is an image and the output is a list of estimated ages and bounding box coordinates of each face detected in the image. The format of the bounding box coordinates is [xmin, ymin, width, height]. The model is based on the SSR-Net model. The model files are hosted on IBM Cloud Object Storage. The code in this repository deploys the model as a web service in a Docker container. This repository was developed as part of the IBM Code Model Asset Exchange.
 */
 ModelAssetExchangeServer.prototype.predict = function(parameters){
    if(parameters === undefined) {
        parameters = {};
    }
    var deferred = Q.defer();
    var domain = this.domain,  path = '/model/predict';
    var body = {}, queryParameters = {}, headers = {}, form = {};

        headers['Accept'] = ['application/json'];
        headers['Content-Type'] = ['multipart/form-data'];

        
        
        

                if(parameters['body'] !== undefined){
                    form['body'] = parameters['body'];
                }

        if(parameters['body'] === undefined){
            deferred.reject(new Error('Missing required  parameter: body'));
            return deferred.promise;
        }
 
    queryParameters = mergeQueryParams(parameters, queryParameters);

    this.request('POST', domain + path, parameters, body, headers, queryParameters, form, deferred);

    return deferred.promise;
 };

    return ModelAssetExchangeServer;
})();

exports.ModelAssetExchangeServer = ModelAssetExchangeServer;

exports.createBoundingBox = (imageData, modelData) => {
    try {
        let canvas
        const img = new Image()
        img.onload = async () => {
            canvas = createCanvas(img.width, img.height)
            const ctx = canvas.getContext('2d')
            const solidColor = '#1bc6c0';
            const textColor = '#000';
            ctx.drawImage(img, 0, 0)                    
            const boxesArray = modelData.map((obj, i) => obj.face_box)
            boxesArray.forEach((box, i) => {
                ctx.font = '36px sans-serif';
                ctx.textBaseline = 'top';
                ctx.fillStyle = solidColor;
                ctx.strokeStyle = solidColor;
                ctx.lineWidth = "3";
                // BOX GENERATION
                const xMin = box[0];
                const yMin = box[1];
                ctx.strokeRect(...box);
                // LABEL GENERATION
                const label = modelData[i].age_estimation;
                const tagWidth = ctx.measureText(label).width;
                const tHeight = parseInt(ctx.font, 10) * 1.2;
                ctx.fillRect(xMin, yMin, tagWidth + 3, tHeight);
                ctx.fillStyle = textColor;
                ctx.fillText(label, xMin + 2, yMin + 4);
            })
        }
        img.onerror = err => { throw err }
        img.src = imageData
        return canvas.toBuffer();
    } catch (e) {
        console.log(`error processing image - ${ e }`)
        return null
    }
}