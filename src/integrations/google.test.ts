import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// vi.hoisted runs before the vi.mock factory, so mockPermissionsCreate is
// defined by the time the googleapis mock is constructed.
// ---------------------------------------------------------------------------
const {
    mockPermissionsCreate,
    mockDocumentsCreate,
    mockDocumentsGet,
    mockDocumentsBatchUpdate,
} = vi.hoisted(() => ({
    mockPermissionsCreate: vi.fn().mockResolvedValue({}),
    mockDocumentsCreate: vi.fn(),
    mockDocumentsGet: vi.fn(),
    mockDocumentsBatchUpdate: vi.fn().mockResolvedValue({}),
}));

vi.mock("googleapis", () => {
    return {
        google: {
            docs: vi.fn(() => ({
                documents: {
                    create: mockDocumentsCreate,
                    get: mockDocumentsGet,
                    batchUpdate: mockDocumentsBatchUpdate,
                },
            })),
            drive: vi.fn(() => ({
                permissions: {
                    create: mockPermissionsCreate,
                },
                files: {
                    get: vi.fn().mockResolvedValue({ data: { parents: ["root"] } }),
                    update: vi.fn().mockResolvedValue({}),
                },
            })),
        },
    };
});

// Import after mocks are established.
import { shareDocWithGroup, overwriteDoc } from "./google.js";
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

/** Minimal body content stub with an endIndex for clearing tests */
function makeBodyContent(endIndex: number) {
    return [
        { paragraph: { elements: [{ textRun: { content: "hello\n" } }] }, startIndex: 1, endIndex: 6 },
        { paragraph: { elements: [{ textRun: { content: "\n" } }] }, startIndex: 6, endIndex },
    ];
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
            sendNotificationEmail: false,
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

describe("overwriteDoc", () => {
    beforeEach(() => {
        mockPermissionsCreate.mockClear();
        mockDocumentsBatchUpdate.mockClear();
        mockDocumentsGet.mockClear();
        mockDocumentsCreate.mockClear();
    });

    it("deletes existing content and inserts new content", async () => {
        const config = makeConfig();
        const docId = "existing-doc-id";
        const endIndex = 50;

        // First get: to determine end index for clearing
        // Subsequent gets: for applyDocFormatting passes
        mockDocumentsGet.mockResolvedValue({
            data: {
                body: { content: makeBodyContent(endIndex) },
            },
        });

        await overwriteDoc(docId, "Epic Title", "New content", config);

        const batchCalls = mockDocumentsBatchUpdate.mock.calls;

        // First batchUpdate call should delete existing content
        const deleteCall = batchCalls[0];
        expect(deleteCall[0].documentId).toBe(docId);
        expect(deleteCall[0].requestBody.requests[0]).toMatchObject({
            deleteContentRange: {
                range: { startIndex: 1, endIndex: endIndex - 1 },
            },
        });

        // Second batchUpdate call should insert new text
        const insertCall = batchCalls[1];
        expect(insertCall[0].documentId).toBe(docId);
        expect(insertCall[0].requestBody.requests[0]).toMatchObject({
            insertText: {
                location: { index: 1 },
                text: "New content",
            },
        });
    });

    it("skips the delete step when the document is already empty (endIndex <= 2)", async () => {
        const config = makeConfig();
        const docId = "empty-doc-id";

        mockDocumentsGet.mockResolvedValue({
            data: {
                body: {
                    content: [
                        { paragraph: { elements: [] }, startIndex: 0, endIndex: 2 },
                    ],
                },
            },
        });

        await overwriteDoc(docId, "Title", "Some content", config);

        const batchCalls = mockDocumentsBatchUpdate.mock.calls;

        // No deleteContentRange call should be made; first call is insertText
        const firstCallRequests = batchCalls[0][0].requestBody.requests;
        expect(firstCallRequests[0]).toMatchObject({
            insertText: { location: { index: 1 }, text: "Some content" },
        });
    });

    it("does not call documents.create", async () => {
        const config = makeConfig();

        mockDocumentsGet.mockResolvedValue({
            data: { body: { content: makeBodyContent(10) } },
        });

        await overwriteDoc("doc-xyz", "Title", "Content", config);

        expect(mockDocumentsCreate).not.toHaveBeenCalled();
    });

    it("does not call drive.permissions.create (no re-sharing)", async () => {
        const config = makeConfig();

        mockDocumentsGet.mockResolvedValue({
            data: { body: { content: makeBodyContent(10) } },
        });

        await overwriteDoc("doc-xyz", "Title", "Content", config);

        expect(mockPermissionsCreate).not.toHaveBeenCalled();
    });
});
