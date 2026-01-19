package com.project.RespiNet.app.controller;

import java.time.Instant;
import java.util.List;
import com.project.RespiNet.app.models.HistoryEntry;
import com.project.RespiNet.app.repository.HistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@RestController
@RequestMapping("/api/user/history")
public class HistoryController {

    public static class CreateHistoryRequest {
        @NotBlank
        public String prediction;

        @NotNull
        public Double confidence;

        // Optional ISO timestamp string from ML response
        public String timestamp;
    }

    @Autowired
    private HistoryRepository historyRepository;

    @GetMapping
    public ResponseEntity<List<HistoryEntry>> list() {
        String email = currentUserEmail();
        if (email == null || email.isBlank()) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(historyRepository.findByUserEmailOrderByCreatedAtDesc(email));
    }

    @PostMapping
    public ResponseEntity<HistoryEntry> create(@RequestBody CreateHistoryRequest body) {
        String email = currentUserEmail();
        if (email == null || email.isBlank()) {
            return ResponseEntity.status(401).build();
        }

        HistoryEntry entry = new HistoryEntry();
        entry.setUserEmail(email);
        entry.setPrediction(body.prediction);
        entry.setConfidence(body.confidence);
        entry.setTimestamp(body.timestamp != null && !body.timestamp.isBlank() ? body.timestamp : Instant.now().toString());
        entry.setCreatedAt(Instant.now());

        return ResponseEntity.ok(historyRepository.save(entry));
    }

    private String currentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) return null;
        return String.valueOf(auth.getPrincipal());
    }
}
