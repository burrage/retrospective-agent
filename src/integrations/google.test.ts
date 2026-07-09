import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// vi.hoisted runs before the vi.mock factory, so mockPermissionsCreate is
// defined by the time the googleapis mock is constructed.
// ---------------------------------------------------------------------------
const { mockPermissionsCreate } = vi.hoisted(() => ({
    mockPermissionsCreate: vi.fn().mockResolvedValue({}),
}));

vi.mock("googleapis", () => {
    return {
        google: {
            drive: vi.fn(() => ({
                permissions: {
                    create: mockPermissionsCreate,
                },
            })),
        },
    };
});

// Import after mocks are established.
import { shareDocWithGroup } from "./google.js";
import type { AppConfig } from "../config.js";

function makeConfig(overrides: Partial<AppConfig> = {}): AppConfig {
    return {
        PORT: 8080,
        JIRA_BASE_URL: "https://jira.example.com",
        JIRA_EMAIL: "test@example.com",
        JIRA_API_TOKEN: "token",
        googleAuth: {} as AppConfig["googleAuth"],
        GOOGLE_DRIVE_FOLDER_ID: "folder-id",
        DEFAULT_TIMEZONE: "America/Chicago",
        SLACK_WEBHOOK_URL: "",
        STORAGE_BUCKET: "bucket",
        GOOGLE_OAUTH_CLIENT_ID: "client-id",
        GOOGLE_OAUTH_CLIENT_SECRET: "client-secret",
        SESSION_SECRET: "session-secret",
        ALLOWED_EMAILS: ["admin@example.com"],
        BASE_URL: "http://localhost:8080",
        ...overrides,
    };
}

describe("shareDocWithGroup", () => {
    beforeEach(() => {
        mockPermissionsCreate.mockClear();
    });

    it("calls drive.permissions.create with writer role and group type", async () => {
        const config = makeConfig();
        await shareDocWithGroup("doc-123", "productdevelopment@curiouslearning.org", config);

        expect(mockPermissionsCreate).toHaveBeenCalledOnce();
        expect(mockPermissionsCreate).toHaveBeenCalledWith({
            fileId: "doc-123",
            requestBody: {
                type: "group",
                role: "writer",
                emailAddress: "productdevelopment@curiouslearning.org",
            },
        });
    });

    it("uses the provided fileId", async () => {
        const config = makeConfig();
        await shareDocWithGroup("another-doc-456", "productdevelopment@curiouslearning.org", config);

        expect(mockPermissionsCreate).toHaveBeenCalledWith(
            expect.objectContaining({ fileId: "another-doc-456" })
        );
    });

    it("uses the provided group email", async () => {
        const config = makeConfig();
        await shareDocWithGroup("doc-789", "othergroup@example.com", config);

        expect(mockPermissionsCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                requestBody: expect.objectContaining({
                    emailAddress: "othergroup@example.com",
                }),
            })
        );
    });

    it("propagates errors thrown by the Drive API", async () => {
        mockPermissionsCreate.mockRejectedValueOnce(new Error("Drive API error"));

        const config = makeConfig();
        await expect(
            shareDocWithGroup("doc-err", "productdevelopment@curiouslearning.org", config)
        ).rejects.toThrow("Drive API error");
    });
});
