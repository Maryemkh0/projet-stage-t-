package com.codix.cicdai.cicd_ai_app.model;

public class StepExecution {
    private PipelineStep step;
    private PipelineStatus status;
    private String logs;
    private String errorAnalysis;
    private long durationMs;

    public StepExecution() {
    }

    public StepExecution(PipelineStep step) {
        this.step = step;
        this.status = PipelineStatus.IDLE;
        this.logs = "";
        this.errorAnalysis = null;
        this.durationMs = 0;
    }

    public PipelineStep getStep() {
        return step;
    }

    public void setStep(PipelineStep step) {
        this.step = step;
    }

    public PipelineStatus getStatus() {
        return status;
    }

    public void setStatus(PipelineStatus status) {
        this.status = status;
    }

    public String getLogs() {
        return logs;
    }

    public void setLogs(String logs) {
        this.logs = logs;
    }

    public String getErrorAnalysis() {
        return errorAnalysis;
    }

    public void setErrorAnalysis(String errorAnalysis) {
        this.errorAnalysis = errorAnalysis;
    }

    public long getDurationMs() {
        return durationMs;
    }

    public void setDurationMs(long durationMs) {
        this.durationMs = durationMs;
    }
}
