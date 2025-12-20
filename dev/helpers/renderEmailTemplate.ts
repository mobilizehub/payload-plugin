export const renderEmailTemplate = (args: any) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>${args.subject}</title>
    <style>
        p {
            margin: 0 0 15px 0;
            color: #666666;
            font-size: 16px;
            line-height: 1.6;
        }
        h1, h2, h3, h4, h5, h6 {
            color: #333333;
            margin: 20px 0 10px 0;
        }
        a {
            color: #4A90E2;
            text-decoration: none;
        }
        strong {
            color: #333333;
        }
        ul, ol {
            margin: 15px 0;
            padding-left: 20px;
            color: #666666;
        }
        li {
            margin-bottom: 8px;
        }
        code {
            background-color: #f4f4f4;
            padding: 2px 4px;
            font-family: 'Courier New', Courier, monospace;
            font-size: 14px;
        }
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff">
                    <tr>
                        <td style="padding: 40px 30px;">
                            <div>
                                ${args.html}
                            </div>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding-top: 30px; padding-bottom: 10px; background-color: #f8f8f8; text-align: center;">
                            <p style="margin: 0; color: #999999; font-size: 14px;">
                                © 2025 Payload. All rights reserved.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding-bottom: 30px; background-color: #f8f8f8; text-align: center;">
                            <a href="https://example.com/unsubscribe?token=${args.token}" style="font-size: 10px;">Unsubscribe from all emails</a>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `.trim()
}
