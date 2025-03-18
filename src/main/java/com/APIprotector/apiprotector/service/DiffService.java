package com.APIprotector.apiprotector.service;

import java.util.Arrays;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.github.difflib.DiffUtils;
import com.github.difflib.patch.Patch;


@Service
public class DiffService {

    public DiffService() {

    }

    public String diff(String previous, String current) {
        Patch<String> patch = DiffUtils.diff(Arrays.asList(previous.split("\r\n")), Arrays.asList(current.split("\r\n")));
        return patch.getDeltas().stream().map(Objects::toString)
                    .map(e -> parseDiffToJSON(e))
                    .collect(Collectors.joining(", ", "[ ", " ]"));
    }
    private String parseDiffToJSON(String text) {
        Pattern pattern = Pattern.compile("^\\[(.+?)Delta, position: (\\d+)");
        Matcher matcher = pattern.matcher(text);
        if (!matcher.find()) {
            return null;
        }
        String type = matcher.group(1);
        String position = matcher.group(2);

        if (type.equalsIgnoreCase("Insert") || type.equalsIgnoreCase("Delete")) {
            pattern = Pattern.compile("lines: \\[(.+?)]");
            matcher = pattern.matcher(text);
            if (!matcher.find()) {
                return null;
            }
            String content = matcher.group(1).replaceAll("\"", "\\\\\"");
            return String.format("{\"type\": \"%s\", \"position\": \"%s\", \"content\": \"[%s]\"}", type, position, content);

        }
        else if (type.equalsIgnoreCase("Change")) {
            pattern = Pattern.compile("lines: \\[(.+?)] to \\[(.+?)]");
            matcher = pattern.matcher(text);
            if (!matcher.find()) {
                return null;
            }
            String from = matcher.group(1).replaceAll("\"", "\\\\\"");
            String to = matcher.group(2).replaceAll("\"", "\\\\\"");
            return String.format("{\"type\": \"%s\", \"position\": \"%s\", \"from\": \"%s\", \"to\": \"%s\"}", type, position, from, to);
        }
        else {
            return "{\"type\" :\"Equal\"}";
        }
    }
}
