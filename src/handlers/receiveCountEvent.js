'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
    console.log("[ReceiveCountEvent] Event received:", event);

    const messagePayload = event.message;

    const countEvent = countEventFactory(
        messagePayload['vehicleId'],
        messagePayload['deviceId'],
        messagePayload['startedAt'],
        messagePayload['endedAt'],
        messagePayload['countEntering'],
        messagePayload['countExiting'],
        messagePayload['latitudePos'],
        messagePayload['longitudePos'],
    );

    await submitCountEvent(countEvent);
};

const submitCountEvent = (countEventItem) => {
    console.log('[ReceiveCountEvent] Putting event in DynamoDB...');

    const countEventInfo = {
        TableName: process.env.COUNT_EVENT_TABLE,
        Item: countEventItem,
    };

    return dynamoDb.put(countEventInfo).promise()
        .then(res => countEventItem);
}

const countEventFactory = (vehicleId, deviceId, startedAt, endedAt, countEntering, countExiting, latitudePos, longitudePos) => {
    return {
        eventId: uuid.v1(),
        vehicleId,
        deviceId,
        startedAt,
        endedAt,
        countEntering,
        countExiting,
        latitudePos,
        longitudePos,
    };
}

