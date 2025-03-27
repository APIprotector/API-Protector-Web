package com.APIprotector.apiprotector.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;

public class DiffNode {
    @JsonProperty
    String key;

    @JsonProperty
    String path;

    @JsonProperty
    String type;

    @JsonProperty
    JsonNode value1;

    @JsonProperty
    JsonNode value2;

    @JsonProperty
    List<DiffNode> children = new ArrayList<>();

    public DiffNode(String key, String path, String type, JsonNode value1, JsonNode value2) {
        this.key = key;
        this.path = path;
        this.type = type;
        this.value1 = value1;
        this.value2 = value2;
    }
}
