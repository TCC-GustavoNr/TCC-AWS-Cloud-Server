'use strict';

const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const AJV = require('ajv').default;
const addFormats = require('ajv-formats').default;
const ajv = new AJV();
addFormats(ajv);

const schemaVal = {
    type: "object",
    properties: {
        vehicleId: { type: "string" },
        deviceId: { type: "string" },
        startDate: { type: "string", format: "date-time" },
        endDate: { type: "string", format: "date-time" },
    },
    required: ["vehicleId", "startDate"],
};

module.exports.handler = async (event) => {
    try {
        console.log('[GetCountEvent] Request received.');

        const queryParams = event.queryStringParameters;

        console.log("[GetCountEvent] Query params:", queryParams);

        const isValid = ajv.validate(schemaVal, queryParams);
        if (!isValid) {
            const errorText = ajv.errorsText();
            console.error("[GetCountEvent] Bad Request:", errorText);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: errorText }),
            };
        }

        const vehicleId = queryParams.vehicleId;
        const deviceId = queryParams.deviceId;
        const startDate = queryParams.startDate;
        const endDate = queryParams.endDate || (new Date()).toISOString();

        const countEvents = await getCountEventsBetweenDates(vehicleId, deviceId, startDate, endDate);

        const { totalEntering, totalExiting } = countEvents.Items?.reduce((acc, curr) => {
            return {
                totalEntering: acc.totalEntering + curr.countEntering,
                totalExiting: acc.totalExiting + curr.countExiting,
            };
        }, { totalEntering: 0, totalExiting: 0 });

        return {
            statusCode: 200,
            body: JSON.stringify({
                totalEntering,
                totalExiting,
                events: countEvents.Items,
            }),
        };
    } catch (error) {
        console.log('[GetCountEvent] Internal Server Error:', { error });
        return {
            statusCode: 500,
            body: '500 Internal Server Error',
        };
    }
};

const getCountEventsBetweenDates = async (vehicleId, deviceId, startDate, endDate) => {
    console.log('[GetCountEvent] Getting event(s) in DynamoDB...');

    let keyConditionExpr = "";
    let filterExpr = "startedAt BETWEEN :startDate AND :endDate";
    let valuesExpr = { ":startDate": startDate, ":endDate": endDate };

    if (vehicleId) {
        keyConditionExpr += keyConditionExpr ? " AND " : "";
        keyConditionExpr += "vehicleId = :vehicleId";
        valuesExpr = { ...valuesExpr, ":vehicleId": vehicleId };
    }

    console.log("[GetCountEvent] Key condition expression:", keyConditionExpr);

    const params = {
        TableName: process.env.COUNT_EVENT_TABLE,
        KeyConditionExpression: keyConditionExpr,
        FilterExpression: filterExpr,
        ExpressionAttributeValues: valuesExpr,
    };

    return dynamoDb.query(params).promise();
}
