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

    // Request push permission right after startup (Android 13+)
    if (window.retenosdk && typeof window.retenosdk.requestNotificationPermission === 'function') {
        window.retenosdk.requestNotificationPermission();
    }

    var statusEl = document.getElementById('retenoStatus');
    var externalUserIdEl = document.getElementById('retenoExternalUserId');
    var btn = document.getElementById('retenoSetUserAttributesBtn');

    var emailEl = document.getElementById('retenoEmail');
    var phoneEl = document.getElementById('retenoPhone');
    var firstNameEl = document.getElementById('retenoFirstName');
    var lastNameEl = document.getElementById('retenoLastName');
    var languageCodeEl = document.getElementById('retenoLanguageCode');
    var timeZoneEl = document.getElementById('retenoTimeZone');

    var addressRegionEl = document.getElementById('retenoAddressRegion');
    var addressTownEl = document.getElementById('retenoAddressTown');
    var addressLineEl = document.getElementById('retenoAddressLine');
    var addressPostcodeEl = document.getElementById('retenoAddressPostcode');

    var fieldKeyEl = document.getElementById('retenoFieldKey');
    var fieldValueEl = document.getElementById('retenoFieldValue');

    // Prefill defaults for demo convenience (don't override user's edits).
    if (externalUserIdEl && !String(externalUserIdEl.value || '').trim()) {
        externalUserIdEl.value = 'demo_user_123';
    }

    if (emailEl && !String(emailEl.value || '').trim()) emailEl.value = 'john.doe@example.com';
    if (phoneEl && !String(phoneEl.value || '').trim()) phoneEl.value = '+380671234567';
    if (firstNameEl && !String(firstNameEl.value || '').trim()) firstNameEl.value = 'John';
    if (lastNameEl && !String(lastNameEl.value || '').trim()) lastNameEl.value = 'Doe';
    if (languageCodeEl && !String(languageCodeEl.value || '').trim()) languageCodeEl.value = 'en';
    if (timeZoneEl && !String(timeZoneEl.value || '').trim()) timeZoneEl.value = 'Europe/Kyiv';

    if (addressRegionEl && !String(addressRegionEl.value || '').trim()) addressRegionEl.value = 'Kyiv';
    if (addressTownEl && !String(addressTownEl.value || '').trim()) addressTownEl.value = 'Kyiv';
    if (addressLineEl && !String(addressLineEl.value || '').trim()) addressLineEl.value = 'Main street 1';
    if (addressPostcodeEl && !String(addressPostcodeEl.value || '').trim()) addressPostcodeEl.value = '01001';

    if (fieldKeyEl && !String(fieldKeyEl.value || '').trim()) fieldKeyEl.value = 'plan';
    if (fieldValueEl && !String(fieldValueEl.value || '').trim()) fieldValueEl.value = 'premium';

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

            function read(el) {
                return el ? String(el.value || '').trim() : '';
            }

            var userAttributes = {};
            var email = read(emailEl);
            var phone = read(phoneEl);
            var firstName = read(firstNameEl);
            var lastName = read(lastNameEl);
            var languageCode = read(languageCodeEl);
            var timeZone = read(timeZoneEl);

            if (email) userAttributes.email = email;
            if (phone) userAttributes.phone = phone;
            if (firstName) userAttributes.firstName = firstName;
            if (lastName) userAttributes.lastName = lastName;
            if (languageCode) userAttributes.languageCode = languageCode;
            if (timeZone) userAttributes.timeZone = timeZone;

            var region = read(addressRegionEl);
            var town = read(addressTownEl);
            var addressLine = read(addressLineEl);
            var postcode = read(addressPostcodeEl);
            if (region || town || addressLine || postcode) {
                userAttributes.address = {};
                if (region) userAttributes.address.region = region;
                if (town) userAttributes.address.town = town;
                if (addressLine) userAttributes.address.address = addressLine;
                if (postcode) userAttributes.address.postcode = postcode;
            }

            var fieldKey = read(fieldKeyEl);
            var fieldValue = read(fieldValueEl);
            if (fieldKey && fieldValue) {
                userAttributes.fields = [{ key: fieldKey, value: fieldValue }];
            }

            // `user` is optional; only send when at least one attribute is present.
            var user = null;
            if (Object.keys(userAttributes).length > 0) {
                user = { userAttributes: userAttributes };
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
