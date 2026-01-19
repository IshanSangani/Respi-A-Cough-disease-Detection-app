package com.project.RespiNet.app.repository;

import java.util.List;
import com.project.RespiNet.app.models.HistoryEntry;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface HistoryRepository extends MongoRepository<HistoryEntry, String> {
    List<HistoryEntry> findByUserEmailOrderByCreatedAtDesc(String userEmail);
}
