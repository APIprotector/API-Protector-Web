package com.APIprotector.apiprotector.Controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Random;

@RestController
@RequestMapping("/api/v1/hello")
public class HelloController {

    private static Random random = new Random();
    private static ArrayList<String> helloWorlds = new ArrayList<>(
            java.util.List.of(
                    "Hello, World!", "Hola, Mundo!", "Bonjour, le Monde!", "Hallo, Welt!", "Ciao, Mondo!",
                    "Привет, мир!", "你好，世界！", "こんにちは、世界！", "안녕하세요, 세계!", "Olá, Mundo!",
                    "Merhaba, Dünya!", "नमस्ते, दुनिया!", "Salam, Dunia!", "Hej, Världen!", "Hallo, Wereld!",
                    "Hei, Maailma!", "Halo, Dunia!", "Γειά σου, Κόσμε!", "שלום, עולם!", "مرحبا، العالم!"
            )
    );

    public HelloController() {
    }

    @GetMapping
    public String getHello() {
        return helloWorlds.get(random.nextInt(helloWorlds.size()));
    }
}
