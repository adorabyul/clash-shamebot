import { DiscordAPIError, HTTPError } from 'discord.js';

export function parseDiscordAPIError(error: DiscordAPIError | HTTPError): string {
    if (error instanceof DiscordAPIError) {
        const code = error.code;
        const message = error.message;

        if (code === 50035) {
            return `Invalid command format: ${message}`;
        }
        if (code === 40062) {
            return `Command validation failed: ${message}`;
        }

        if (error.rawError && typeof error.rawError === 'object') {
            const rawError = error.rawError as { errors?: Record<string, unknown>; message?: string };
            if (rawError.errors) {
                const fieldErrors = Object.entries(rawError.errors)
                    .map(([field, errorData]) => {
                        if (typeof errorData === 'object' && errorData !== null) {
                            const errorObj = errorData as { _errors?: Array<{ message?: string }> };
                            if (errorObj._errors && errorObj._errors.length > 0) {
                                return `${field}: ${errorObj._errors[0].message || 'Invalid value'}`;
                            }
                        }
                        return `${field}: Invalid`;
                    })
                    .join(', ');
                return fieldErrors || message;
            }
            if (rawError.message) {
                return rawError.message;
            }
        }

        return message || `Discord API error (code: ${code})`;
    }

    if (error instanceof HTTPError) {
        return `HTTP error: ${error.message}`;
    }

    return 'Unknown Discord API error';
}

