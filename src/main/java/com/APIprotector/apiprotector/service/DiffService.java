package com.APIprotector.apiprotector.service;

import org.openapitools.openapidiff.core.OpenApiCompare;
import org.openapitools.openapidiff.core.model.ChangedExtensions;
import org.openapitools.openapidiff.core.model.ChangedOpenApi;
import org.openapitools.openapidiff.core.output.AsciidocRender;
import org.openapitools.openapidiff.core.output.HtmlRender;
import org.openapitools.openapidiff.core.output.JsonRender;

import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.OutputStreamWriter;

public class DiffService {

    public static final String OPENAPI_DOC1 = "C:\\Users\\Kamil\\Desktop\\APISpecs\\openapi-test1.yaml";
    public static final String OPENAPI_DOC2 = "C:\\Users\\Kamil\\Desktop\\APISpecs\\openapi-test3.yaml";

    void useDiff() throws FileNotFoundException {
        ChangedOpenApi diff = OpenApiCompare.fromLocations(OPENAPI_DOC1, OPENAPI_DOC2);
//        ChangedOpenApi diff = OpenApiCompare.fromContents(context1, context2);

//        JsonRender jsonRender = new JsonRender();
//        FileOutputStream outputStream = new FileOutputStream("C:\\Users\\Kamil\\Desktop\\APISpecs\\testDiff.json");
//        OutputStreamWriter outputStreamWriter = new OutputStreamWriter(outputStream);
//        jsonRender.render(diff, outputStreamWriter);

        HtmlRender htmlRender = new HtmlRender("Changelog", "http://deepoove.com/swagger-diff/stylesheets/demo.css");
        FileOutputStream outputStream = new FileOutputStream("C:\\Users\\Kamil\\Desktop\\APISpecs\\testDiff.html");
        OutputStreamWriter outputStreamWriter = new OutputStreamWriter(outputStream);
        htmlRender.render(diff, outputStreamWriter);

//        AsciidocRender asciidocRender = new AsciidocRender();
//        FileOutputStream outputStream = new FileOutputStream(":\\Users\\Kamil\\Desktop\\APISpecs\\testDiff.adoc");
//        OutputStreamWriter outputStreamWriter = new OutputStreamWriter(outputStream);
//        asciidocRender.render(diff, outputStreamWriter);

    }

    public static void main(String[] args) throws FileNotFoundException {
        DiffService diffService = new DiffService();
        diffService.useDiff();
    }

    String context1 = """
            openapi: "3.0.0"
            info:
              title: "Test API"
              version: "1.0.0"
            paths:
              /health:
                get:
                  summary: "Get health status"
                  responses:
                    200:
                      description: "Success"
            """;
    String context2 = """
            openapi: "3.0.0"
            info:
              title: "Test API"
              version: "2.0.0"
            paths:
              /health:
                get:
                  summary: "Get health status"
                  responses:
                    200:
                      description: "Failure"
            """;
}
