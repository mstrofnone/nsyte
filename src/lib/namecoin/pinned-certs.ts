/**
 * Pinned self-signed leaf certificates for Namecoin ElectrumX endpoints.
 *
 * Three of the four servers in {@link DEFAULT_ELECTRUMX_SERVERS} present
 * self-signed RSA-2048 certificates. Pinning the leaf PEMs in the TLS
 * trust store passed to `Deno.connectTls({ caCerts })` lets the client
 * verify each operator's server identity without depending on a public
 * CA.
 *
 * Source: the same constants used by the Amethyst Android / Desktop
 * client, the gitworkshop browser port, and the
 * `mstrofnone/nostrlib-nip05-namecoin` Go reference. Refresh in
 * lockstep with those projects on rotation.
 */

/** electrumx.testls.space:50002 — expires 2027-05-04.
 *  SHA-256: 53:65:D5:BB:26:19:F5:40:1C:D8:8E:FC:AF:FB:A5:B2:A0:EA:7A:99:2D:F7:0F:05:7E:9B:CD:50:36:C7:79:9C */
const CERT_TESTLS_SPACE = `-----BEGIN CERTIFICATE-----
MIIDwzCCAqsCFGGKT5mjh7oN98aNyjOCiqafL8VyMA0GCSqGSIb3DQEBCwUAMIGd
MQswCQYDVQQGEwJVUzEQMA4GA1UECAwHQ2hpY2FnbzEQMA4GA1UEBwwHQ2hpY2Fn
bzESMBAGA1UECgwJSW50ZXJuZXRzMQ8wDQYDVQQLDAZJbnRlcncxHjAcBgNVBAMM
FWVsZWN0cnVtLnRlc3Rscy5zcGFjZTElMCMGCSqGSIb3DQEJARYWbWpfZ2lsbF84
OUBob3RtYWlsLmNvbTAeFw0yMjA1MDUwNjIzNDFaFw0yNzA1MDQwNjIzNDFaMIGd
MQswCQYDVQQGEwJVUzEQMA4GA1UECAwHQ2hpY2FnbzEQMA4GA1UEBwwHQ2hpY2Fn
bzESMBAGA1UECgwJSW50ZXJuZXRzMQ8wDQYDVQQLDAZJbnRlcncxHjAcBgNVBAMM
FWVsZWN0cnVtLnRlc3Rscy5zcGFjZTElMCMGCSqGSIb3DQEJARYWbWpfZ2lsbF84
OUBob3RtYWlsLmNvbTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAO4H
+PKCdiiz3jNOA77aAmS2YaU7eOQ8ZGliEVr/PlLcgF5gmthb2DI6iK4KhC1ad34G
1n9IhkXPhkVJ94i8wB3uoTBlA7mI5h59m01yhzSkJAoYoU/i6DM9ipbakqWFCTEp
P+yE216NTU5MbYwThZdRSAIIABe9RyIliMSidyrwHvKBLfnJPFScghW6rhBWN7PG
PA8k0MFGzf+HXbpnV/jAvz08ZC34qiBIjkJrTgh49JweyoZKdppyJcH4UbkslJ2t
YUJR3oURBvrPj+D7TwLVRbX36ul7r4+dP3IjgmljsSAHDK4N/PfWrCBdlj9Pc1Cp
yX+ZDh8X2NrL4ukHoVMCAwEAATANBgkqhkiG9w0BAQsFAAOCAQEAeVj6VZNmY/Vb
nhzrC7xBSHqVWQ1wkLOClLsdvgKP8cFFJuUoCMQU5bPMi7nWnkfvvsIKH4Eibk5K
fqiA9jVsY0FHvQ8gP3KMk1LVuUf/sTcRe5itp3guBOSk/zXZUD5tUz/oRk3k+rdc
MsInqhomjNy/dqYmD6Wm4DNPjZh6fWy+AVQKVNOI2t4koaVdpoi8Uv8h4gFGPbdI
sVmtoGiIGkKNIWum+6mnF6PfynNrLk+ztH4TrdacVNeoJUPYEAxOuesWXFy3H4r+
HKBqA4xAzyjgKLPqoWnjSu7gxj1GIjBhnDxkM6wUOnDq8A0EqxR+A17OcXW9sZ2O
2ZIVwmtnyA==
-----END CERTIFICATE-----`;

/** nmc2.bitcoins.sk:57002 — expires 2030-10-22. */
const CERT_NMC2_BITCOINS_SK = `-----BEGIN CERTIFICATE-----
MIID+TCCAuGgAwIBAgIUdmJGukmfPvqmAYpTfuGcjRoYHJ8wDQYJKoZIhvcNAQEL
BQAwgYsxCzAJBgNVBAYTAlNLMREwDwYDVQQIDAhTbG92YWtpYTETMBEGA1UEBwwK
QnJhdGlzbGF2YTEUMBIGA1UECgwLYml0Y29pbnMuc2sxGTAXBgNVBAMMEG5tYzIu
Yml0Y29pbnMuc2sxIzAhBgkqhkiG9w0BCQEWFGRlYWZib3lAY2ljb2xpbmEub3Jn
MB4XDTIwMTAyNDE5MjQzOVoXDTMwMTAyMjE5MjQzOVowgYsxCzAJBgNVBAYTAlNL
MREwDwYDVQQIDAhTbG92YWtpYTETMBEGA1UEBwwKQnJhdGlzbGF2YTEUMBIGA1UE
CgwLYml0Y29pbnMuc2sxGTAXBgNVBAMMEG5tYzIuYml0Y29pbnMuc2sxIzAhBgkq
hkiG9w0BCQEWFGRlYWZib3lAY2ljb2xpbmEub3JnMIIBIjANBgkqhkiG9w0BAQEF
AAOCAQ8AMIIBCgKCAQEAzBUkZNDfaz7kc28l5tDKohJjekWmz1ynzfGx3ZLsqOZE
c+kNfcMaWU+zT/j0mV6pX6KSH7G9pPAku+8PRdKRq+d63wiJDEjGSaFztQWKW6L1
vTxgCK5gu+Eir3BkTagJObsrLKS+T6qH610/3+btGgoR3lunB5TzCgB/9oQanjDW
zjg2CwmxgR5Iw1Eqfenx7zkSK33FSXSF2SvbUs1Atj2oPU4DLivyrx0RaUmaPemn
cmcpnax+py4pQeB6dJWU1INhzXt3hTJRyoqsSGY3vCECIKIBIkh8GsYjAX4z+Y9y
6pJx0da2b88qPWdsoxaIMvrQiuWknDrSJwAyw2Yd8QIDAQABo1MwUTAdBgNVHQ4E
FgQUT2J83B2/9jxGGdFeWrxMohTzHNwwHwYDVR0jBBgwFoAUT2J83B2/9jxGGdFe
WrxMohTzHNwwDwYDVR0TAQH/BAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEAsbxX
wN8tZaXOybImMZCQS7zfxmKl2IAcqu+R01KPfnIfrFqXPsGDDl3rYLkwh1O4/hYQ
NKNW9KTxoJxuBmAkm7EXQQh1XUUzajdEDqDBVRyvR0Z2MdMYnMSAiiMXMl2wUZnc
QXYftBo0HbtfsaJjImQdDjmlmRPSzE/RW6iUe+1cesKBC7e8nVf69Yu/fxO4m083
VWwAstlWJfk1GyU7jzVc8svealg/oIiDoOMe6CFSLx1BDv2FeHSpRdqd3fn+AC73
bK2N2smrHUOQnFijuiFw3WOrjERi0eMhjVNfVu9W9ZYa/Wd6SdIzV55LbG+NpmSf
5W7ix41hRvdT6cTAJA==
-----END CERTIFICATE-----`;

/** relay.testls.bit:50002 — expires 2036-04-30.
 *  Self-signed RSA-2048 (CN=relay.testls.bit) served by ElectrumX-NMC
 *  alongside the Namecoin-anchored Nostr relay.
 *  SHA-256 (DER): BB:0B:35:E6:42:35:A7:94:E1:57:B6:9A:CD:72:DA:4C:CC:16:A4:D8:1D:0F:F6:B1:D8:F7:FD:FC:6C:CA:6C:BA */
const CERT_RELAY_TESTLS_BIT = `-----BEGIN CERTIFICATE-----
MIIDFzCCAf+gAwIBAgIUAz+Ky5Lu2u1QchHKTwQIStWD8fQwDQYJKoZIhvcNAQEL
BQAwGzEZMBcGA1UEAwwQcmVsYXkudGVzdGxzLmJpdDAeFw0yNjA1MDMwNjEyNDBa
Fw0zNjA0MzAwNjEyNDBaMBsxGTAXBgNVBAMMEHJlbGF5LnRlc3Rscy5iaXQwggEi
MA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCngMim0wilCdclMyIIBRAeFBjE
HWA0l5n3ebCtyepYmyXUrbth2TDdyMHiUNVvE3f7RSAUFtE+Tjb9+xzmLf04qlbC
i3b2DV3xdVOZpRCI4kybmraYG6lRLQJ5I/N8NWgPsFgcy2mZF3q0yMVEkzGAKqUT
QGZd2eBs/OVicbCWKmgyhXlnqGeHIs4iKOqenHKSZ8QE5bhAKaMn+Q116QEdBg12
svGNoSZSlX8hDNUf5N5pOcsK8vj0Yb0ypJOd0J5eVpYS/KA0oMMwALnEs0H17hfO
IIaWqrbfaqmdR67uzUfci2EoiwQJrXSy7WkNiVX0ikN02VlUPCb2OaSABmwjAgMB
AAGjUzBRMB0GA1UdDgQWBBSgnHYFU93wufP131xk5w843VWhATAfBgNVHSMEGDAW
gBSgnHYFU93wufP131xk5w843VWhATAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3
DQEBCwUAA4IBAQAiVC5RJj/Y3S5uNYraPmRLQrgPui9eGlWDh6LeZvjftACA3WiN
XabJtTmHxOFFwxmBtzGVCWKR6udETHyfqaq0me/XoYLjGstYTd14GfoV9Klx7Glh
gLOgqC3Do04o2xnXxhPh00c0jUggKdI05KLVAc4dLfU/XDrOfxBl4XHZY4lYz4CF
bn+n5Q1cqqcGqoJIHl2cgDdrxSMigIpsunjk8cJXO+hsteA/Pd1UUY5plvE9nbNv
hy4QgfNqjy36b0Nbm7Fc9Te9W6zgXjHM+q7KhuQvTfKh2sHbCJzRcy7Chgwqyrfq
NsK0JcBkyRPB+fXmEoE/Xmj/UnOD0fZCCanD
-----END CERTIFICATE-----`;

/**
 * Default pinned-certificate trust store passed to `Deno.connectTls`.
 *
 * `Deno.connectTls({ caCerts })` adds the supplied PEMs to the
 * system root store rather than replacing it, so the LE-certificated
 * endpoint in {@link DEFAULT_ELECTRUMX_SERVERS} continues to verify
 * normally against the OS roots while the three self-signed
 * endpoints below verify against their pinned leaves.
 */
export const PINNED_ELECTRUMX_CERTS: readonly string[] = [
  CERT_TESTLS_SPACE,
  CERT_NMC2_BITCOINS_SK,
  CERT_RELAY_TESTLS_BIT,
];
