package com.codix.cicdai.cicd_ai_app.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Simple controller to expose static pages via friendly URLs.
 * The static resources live under src/main/resources/static and are served
 * automatically by Spring Boot. However, accessing a path without the .html
 * extension (e.g. /clients) results in a 404. This controller redirects such
 * requests to the appropriate static file.
 */
@Controller
public class ClientPageController {

    @GetMapping("/clients")
    public String clients() {
        // redirect to the static HTML page placed in src/main/resources/static
        return "redirect:/clients.html";
    }

    // Optional: make the root URL redirect to the main dashboard (index.html)
    @GetMapping("/")
    public String home() {
        return "redirect:/index.html";
    }
}
