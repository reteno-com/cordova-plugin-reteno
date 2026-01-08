/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// Wait for the deviceready event before using any of Cordova's device APIs.
// See https://cordova.apache.org/docs/en/latest/cordova/events/events.html#deviceready
document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    // Cordova is now initialized. Have fun!

    console.log('Running cordova-' + cordova.platformId + '@' + cordova.version);
    document.getElementById('deviceready').classList.add('ready');

    var statusEl = document.getElementById('retenoStatus');
    var externalUserIdEl = document.getElementById('retenoExternalUserId');
    var userJsonEl = document.getElementById('retenoUserJson');
    var btn = document.getElementById('retenoSetUserAttributesBtn');

    // Prefill defaults for demo convenience (don't override user's edits).
    if (externalUserIdEl && !String(externalUserIdEl.value || '').trim()) {
        externalUserIdEl.value = 'demo_user_123';
    }

    if (userJsonEl && !String(userJsonEl.value || '').trim()) {
        userJsonEl.value = JSON.stringify(
            {
                userAttributes: {
                    email: 'john.doe@example.com',
                    phone: '+1234567890',
                    firstName: 'John',
                    lastName: 'Doe',
                    languageCode: 'en',
                    timeZone: 'Europe/Kyiv',
                    address: {
                        region: 'Kyiv',
                        town: 'Kyiv',
                        address: 'Main street 1',
                        postcode: '01001',
                    },
                    fields: [{ key: 'plan', value: 'premium' }],
                },
            },
            null,
            2
        );
    }

    function setStatus(text) {
        if (statusEl) {
            statusEl.textContent = text;
        }
    }

    function getRetenoSdk() {
        return (window && window.retenosdk) ? window.retenosdk : null;
    }

    // Best-effort auto init for demo purposes.
    var sdk = getRetenoSdk();
    if (sdk && typeof sdk.init === 'function') {
        try {
            sdk.init(
                {},
                function () {
                    setStatus('Reteno initialized');
                },
                function (err) {
                    setStatus('Reteno init error: ' + (err && err.message ? err.message : String(err)));
                }
            );
        } catch (e) {
            setStatus('Reteno init exception: ' + (e && e.message ? e.message : String(e)));
        }
    } else {
        setStatus('Reteno SDK is not available (window.retenosdk missing).');
    }

    if (btn) {
        btn.addEventListener('click', function () {
            var sdk2 = getRetenoSdk();
            if (!sdk2 || typeof sdk2.setUserAttributes !== 'function') {
                setStatus('Reteno setUserAttributes is not available.');
                return;
            }

            var externalUserId = externalUserIdEl ? String(externalUserIdEl.value || '').trim() : '';
            if (!externalUserId) {
                setStatus('Please provide externalUserId.');
                return;
            }

            var user = null;
            var rawUserJson = userJsonEl ? String(userJsonEl.value || '').trim() : '';
            if (rawUserJson) {
                try {
                    user = JSON.parse(rawUserJson);
                } catch (e) {
                    setStatus('Invalid JSON in user field: ' + (e && e.message ? e.message : String(e)));
                    return;
                }
            }

            var payload = {
                externalUserId: externalUserId,
                user: user,
            };

            setStatus('Sending setUserAttributes...');
            try {
                sdk2.setUserAttributes(
                    payload,
                    function () {
                        setStatus('setUserAttributes: success');
                    },
                    function (err) {
                        setStatus('setUserAttributes: error: ' + (err && err.message ? err.message : String(err)));
                    }
                );
            } catch (e2) {
                setStatus('setUserAttributes exception: ' + (e2 && e2.message ? e2.message : String(e2)));
            }
        });
    }
}
