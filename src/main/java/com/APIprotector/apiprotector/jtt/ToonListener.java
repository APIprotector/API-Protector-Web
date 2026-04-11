package com.APIprotector.apiprotector.jtt;

import org.antlr.v4.runtime.tree.ParseTreeProperty;
import org.stringtemplate.v4.*;
import java.util.*;
import java.util.stream.Collectors;

public class ToonListener extends JSONBaseListener {
  private STGroup group = new STGroupFile("toon.stg");
  private ParseTreeProperty<ST> values = new ParseTreeProperty<>();

  public ST getResult(JSONParser.JsonContext ctx) {
    return values.get(ctx);
  }

  @Override
  public void exitJson(JSONParser.JsonContext ctx) {
    JSONParser.ValueContext v = ctx.value();
    if (v.obj() != null) {
      ST st = group.getInstanceOf("root_obj");
      List<ST> pairs = v.obj().pair().stream()
          .map(p -> values.get(p))
          .collect(Collectors.toList());
      st.add("pairs", pairs);
      values.put(ctx, st);
    } else if (v.arr() != null) {
      ST st = group.getInstanceOf("root_arr");
      st.add("size", v.arr().value().size());
      List<ST> elements = v.arr().value().stream()
          .map(e -> values.get(e))
          .collect(Collectors.toList());
      st.add("elements", elements);
      values.put(ctx, st);
    } else {
      values.put(ctx, values.get(v));
    }
  }

  @Override
  public void exitObj(JSONParser.ObjContext ctx) {
    ST st = group.getInstanceOf("obj");
    List<ST> pairs = ctx.pair().stream()
        .map(p -> values.get(p))
        .collect(Collectors.toList());
    st.add("pairs", pairs);
    values.put(ctx, st);
  }

  @Override
  public void exitPair(JSONParser.PairContext ctx) {
    String name = stripQuotes(ctx.STRING().getText());
    JSONParser.ValueContext v = ctx.value();

    if (v.obj() != null) {
      ST valST = values.get(v.obj());
      ST st = group.getInstanceOf("pair_with_nested_obj");
      st.add("name", name);
      st.add("value", valST);
      values.put(ctx, st);
    } else if (v.arr() != null) {
      ST st = handleArrayWithName(name, v.arr());
      values.put(ctx, st);
    } else {
      ST st = group.getInstanceOf("pair");
      st.add("name", name);
      st.add("value", values.get(v));
      values.put(ctx, st);
    }
  }

  @Override
  public void exitArr(JSONParser.ArrContext ctx) {
    ST st = group.getInstanceOf("root_arr");
    st.add("size", ctx.value().size());
    List<ST> elements = ctx.value().stream()
        .map(e -> values.get(e))
        .collect(Collectors.toList());
    st.add("elements", elements);
    values.put(ctx, st);
  }

  @Override
  public void exitValue(JSONParser.ValueContext ctx) {
    if (ctx.obj() != null) {
      values.put(ctx, values.get(ctx.obj()));
      return;
    }
    if (ctx.arr() != null) {
      values.put(ctx, values.get(ctx.arr()));
      return;
    }

    String text = ctx.getText();
    if (ctx.STRING() != null) {
      String val = stripQuotes(text);
      if (needsQuoting(val)) {
        ST st = group.getInstanceOf("quoted");
        st.add("v", escapeString(val));
        values.put(ctx, st);
      } else {
        ST st = group.getInstanceOf("unquoted");
        st.add("v", val);
        values.put(ctx, st);
      }
    } else {
      ST st = group.getInstanceOf("primitive");
      st.add("v", text);
      values.put(ctx, st);
    }
  }

  private ST handleArrayWithName(String name, JSONParser.ArrContext ctx) {
    List<JSONParser.ValueContext> elements = ctx.value();
    int size = elements.size();
    if (size == 0) {
      ST st = group.getInstanceOf("empty_arr");
      st.add("name", name);
      return st;
    }

    if (isPrimitiveArray(elements)) {
      ST st = group.getInstanceOf("primitive_arr");
      st.add("name", name);
      st.add("size", size);
      st.add("elements", elements.stream().map(e -> values.get(e)).collect(Collectors.toList()));
      return st;
    }

    List<String> headers = getTabularHeaders(elements);
    if (headers != null) {
      ST st = group.getInstanceOf("tabular_arr");
      st.add("name", name);
      st.add("size", size);
      st.add("headers", headers);
      List<String> rows = elements.stream().map(e -> {
        Map<String, ST> fieldMap = new HashMap<>();
        for (JSONParser.PairContext p : e.obj().pair()) {
          fieldMap.put(stripQuotes(p.STRING().getText()), values.get(p.value()));
        }
        return headers.stream()
            .map(h -> {
              ST fv = fieldMap.get(h);
              return fv != null ? fv.render() : "null";
            })
            .collect(Collectors.joining(","));
      }).collect(Collectors.toList());
      st.add("rows", rows);
      return st;
    }

    // Mixed Array
    ST st = group.getInstanceOf("mixed_arr");
    st.add("name", name);
    st.add("size", size);
    List<ST> items = elements.stream().map(e -> {
      if (e.obj() != null) {
        ST itemST = group.getInstanceOf("mixed_arr_obj_item");
        itemST.add("pairs", e.obj().pair().stream().map(p -> values.get(p)).collect(Collectors.toList()));
        return itemST;
      } else {
        ST itemST = group.getInstanceOf("mixed_arr_item");
        itemST.add("value", values.get(e));
        return itemST;
      }
    }).collect(Collectors.toList());
    st.add("items", items);
    return st;
  }

  private boolean isPrimitiveArray(List<JSONParser.ValueContext> elements) {
    for (JSONParser.ValueContext e : elements) {
      if (e.obj() != null || e.arr() != null) return false;
    }
    return true;
  }

  private List<String> getTabularHeaders(List<JSONParser.ValueContext> elements) {
    if (elements.isEmpty()) return null;
    Set<String> commonKeys = null;
    for (JSONParser.ValueContext e : elements) {
      if (e.obj() == null) return null;
      Set<String> keys = new HashSet<>();
      for (JSONParser.PairContext p : e.obj().pair()) {
        if (p.value().obj() != null || p.value().arr() != null) return null;
        keys.add(stripQuotes(p.STRING().getText()));
      }
      if (commonKeys == null) {
        commonKeys = keys;
      } else if (!commonKeys.equals(keys)) {
        return null;
      }
    }
    if (commonKeys == null || commonKeys.isEmpty()) return null;

    return elements.get(0).obj().pair().stream()
        .map(p -> stripQuotes(p.STRING().getText()))
        .collect(Collectors.toList());
  }

  private String stripQuotes(String s) {
    if (s.startsWith("\"") && s.endsWith("\"")) {
      return s.substring(1, s.length() - 1);
    }
    return s;
  }

  private boolean needsQuoting(String s) {
    if (s.isEmpty()) return true;
    if (s.trim().length() != s.length()) return true;
    if (s.equals("true") || s.equals("false") || s.equals("null")) return true;

    if (s.matches("-?\\d+(\\.\\d+)?([eE][+-]?\\d+)?")) return true;
    if (s.matches("0\\d+")) return true;

    String special = ":\"\\{}[]\n\r\t,";
    for (char c : special.toCharArray()) {
      if (s.indexOf(c) >= 0) return true;
    }

    if (s.startsWith("-")) return true;

    return false;
  }

  private String escapeString(String s) {
    return s.replace("\\", "\\\\")
        .replace("\"", "\\\"")
        .replace("\n", "\\n")
        .replace("\r", "\\r")
        .replace("\t", "\\t");
  }
}
