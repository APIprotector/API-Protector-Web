FROM alpine/java:21-jdk@sha256:366ad7df4fafeca51290ccd7d6f046cf4bf3aa312e59bb191b4be543b39f25e2
RUN mkdir /app
WORKDIR /app
COPY ./target/apiprotector-0.0.1-SNAPSHOT.jar /app/app-protector.jar
CMD ["java", "-jar", "app-protector.jar"]
