package com.project.RespiNet.app.models;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "history")
public class HistoryEntry {

    @Id
    private String id;

    private String userEmail;

    private String prediction;

    private Double confidence;

    /**
     * Timestamp coming from the ML response (ISO string). Stored as string for simplicity.
     */
    private String timestamp;

    private Instant createdAt;
}
