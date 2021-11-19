import winston from 'winston';

export default winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: winston.format.simple(),
  transports: [
    new winston.transports.File({
      filename: 'data/log/combined.log',
    }),
    new winston.transports.Console(),
  ],
});