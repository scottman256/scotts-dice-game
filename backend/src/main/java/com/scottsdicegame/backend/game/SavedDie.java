package com.scottsdicegame.backend.game;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class SavedDie {

    @Column
    private Integer face;

    @Column(nullable = false)
    private boolean held;

    protected SavedDie() {
    }

    public SavedDie(Integer face, boolean held) {
        this.face = face;
        this.held = held;
    }

    public Integer getFace() {
        return face;
    }

    public boolean isHeld() {
        return held;
    }
}
