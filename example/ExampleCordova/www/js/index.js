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

    // Show platform-specific app version/build number (e.g. 1.0.0(410)).
    (function initAppVersionLabel() {
        var versionEl = document.getElementById('appVersion');
        if (!versionEl || !window.cordova || !cordova.getAppVersion) {
            return;
        }

        var getVersionNumber = cordova.getAppVersion.getVersionNumber;
        var getVersionCode = cordova.getAppVersion.getVersionCode;
        if (typeof getVersionNumber !== 'function' || typeof getVersionCode !== 'function') {
            return;
        }

        function wrapGetter(fn) {
            return new Promise(function (resolve, reject) {
                try {
                    // Callback signature: fn(success, error)
                    if (fn.length >= 1) {
                        fn(resolve, reject);
                        return;
                    }
                    // Promise signature: fn().then(...)
                    var res = fn();
                    if (res && typeof res.then === 'function') {
                        res.then(resolve).catch(reject);
                        return;
                    }
                    resolve(res);
                } catch (e) {
                    reject(e);
                }
            });
        }

        Promise.all([wrapGetter(getVersionNumber), wrapGetter(getVersionCode)])
            .then(function (parts) {
                var version = String(parts[0] || '').trim();
                var build = String(parts[1] || '').trim();
                if (!version) {
                    return;
                }
                versionEl.textContent = build ? (version + '(' + build + ')') : version;
            })
            .catch(function () {});
    })();

    // Request push permission right after startup (Android 13+)
    if (window.retenosdk && typeof window.retenosdk.requestNotificationPermission === 'function') {
        var permissionPromise = window.retenosdk.requestNotificationPermission();
        if (permissionPromise && typeof permissionPromise.catch === 'function') {
            permissionPromise.catch(function () {});
        }
    }

    var statusEl = document.getElementById('retenoStatus');
    var eventStatusEl = document.getElementById('retenoEventStatus');
    var lifecycleStatusEl = document.getElementById('retenoLifecycleStatus');
    var notificationStatusEl = document.getElementById('retenoNotificationStatus');
    var initOptionsSectionEl = document.getElementById('retenoInitOptions');
    var pushReceivedEventEl = document.getElementById('retenoPushReceivedEvent');
    var notificationClickedEventEl = document.getElementById('retenoNotificationClickedEvent');
    var pushReceivedEventListEl = document.getElementById('retenoPushReceivedEventList');
    var notificationClickedEventListEl = document.getElementById('retenoNotificationClickedEventList');
    var externalUserIdEl = document.getElementById('retenoExternalUserId');
    var multiAccountEl = document.getElementById('retenoMultiAccount');
    var anonymousUserEl = document.getElementById('retenoAnonymousUser');
    var btn = document.getElementById('retenoSetUserAttributesBtn');
    var logEventBtn = document.getElementById('retenoLogEventBtn');
    var lifecycleSaveBtn = document.getElementById('retenoLifecycleSaveBtn');
    var lifecycleAllBtn = document.getElementById('retenoLifecycleAllBtn');
    var lifecycleNoneBtn = document.getElementById('retenoLifecycleNoneBtn');
    var notificationApplyBtn = document.getElementById('retenoNotificationApplyBtn');
    var pushReceivedListenerToggle = document.getElementById('retenoPushReceivedListenerToggle');
    var notificationClickedListenerToggle = document.getElementById('retenoNotificationClickedListenerToggle');
    var pushDismissedListenerToggle = document.getElementById('retenoPushDismissedListenerToggle');
    var customPushReceivedListenerToggle = document.getElementById('retenoCustomPushReceivedListenerToggle');
    var pushButtonClickedListenerToggle = document.getElementById('retenoPushButtonClickedListenerToggle');
    var pushDismissedEventEl = document.getElementById('retenoPushDismissedEvent');
    var customPushReceivedEventEl = document.getElementById('retenoCustomPushReceivedEvent');
    var pushButtonClickedEventEl = document.getElementById('retenoPushButtonClickedEvent');
    var pushDismissedEventListEl = document.getElementById('retenoPushDismissedEventList');
    var customPushReceivedEventListEl = document.getElementById('retenoCustomPushReceivedEventList');
    var pushButtonClickedEventListEl = document.getElementById('retenoPushButtonClickedEventList');
    var inboxStatusEl = document.getElementById('retenoInboxStatusText');
    var inboxCountEl = document.getElementById('retenoInboxCountText');
    var inboxMessagesListEl = document.getElementById('retenoInboxMessagesList');
    var inboxMarkStatusEl = document.getElementById('retenoInboxMarkStatus');
    var inboxPageEl = document.getElementById('retenoInboxPage');
    var inboxPageSizeEl = document.getElementById('retenoInboxPageSize');
    var inboxStatusSelectEl = document.getElementById('retenoInboxStatusSelect');
    var inboxMessageIdEl = document.getElementById('retenoInboxMessageId');
    var recomVariantIdEl = document.getElementById('retenoRecomVariantId');
    var recomProductIdsEl = document.getElementById('retenoRecomProductIds');
    var recomCategoryIdEl = document.getElementById('retenoRecomCategoryId');
    var recomFieldsEl = document.getElementById('retenoRecomFields');
    var recomFilterNameEl = document.getElementById('retenoRecomFilterName');
    var recomFilterValuesEl = document.getElementById('retenoRecomFilterValues');
    var recomStatusEl = document.getElementById('retenoRecommendationsStatus');
    var recomListEl = document.getElementById('retenoRecommendationsList');
    var recomLogVariantIdEl = document.getElementById('retenoRecomLogVariantId');
    var recomLogEventTypeEl = document.getElementById('retenoRecomLogEventType');
    var recomLogProductIdsEl = document.getElementById('retenoRecomLogProductIds');
    var recomLogStatusEl = document.getElementById('retenoRecommendationsLogStatus');
    var getRecommendationsBtn = document.getElementById('retenoGetRecommendationsBtn');
    var logRecommendationsBtn = document.getElementById('retenoLogRecommendationsBtn');
    var ecomStatusEl = document.getElementById('retenoEcomStatus');
    var ecomProductViewedBtn = document.getElementById('retenoEcomProductViewedBtn');
    var ecomProductCategoryViewedBtn = document.getElementById('retenoEcomProductCategoryViewedBtn');
    var ecomProductAddedToWishlistBtn = document.getElementById('retenoEcomProductAddedToWishlistBtn');
    var ecomCartUpdatedBtn = document.getElementById('retenoEcomCartUpdatedBtn');
    var ecomOrderCreatedBtn = document.getElementById('retenoEcomOrderCreatedBtn');
    var ecomOrderUpdatedBtn = document.getElementById('retenoEcomOrderUpdatedBtn');
    var ecomOrderDeliveredBtn = document.getElementById('retenoEcomOrderDeliveredBtn');
    var ecomOrderCancelledBtn = document.getElementById('retenoEcomOrderCancelledBtn');
    var ecomSearchRequestBtn = document.getElementById('retenoEcomSearchRequestBtn');
    var getInboxMessagesBtn = document.getElementById('retenoGetInboxMessagesBtn');
    var getInboxCountBtn = document.getElementById('retenoGetInboxCountBtn');
    var subscribeInboxCountBtn = document.getElementById('retenoSubscribeInboxCountBtn');
    var unsubscribeInboxCountBtn = document.getElementById('retenoUnsubscribeInboxCountBtn');
    var markAsOpenedBtn = document.getElementById('retenoMarkAsOpenedBtn');
    var markAllAsOpenedBtn = document.getElementById('retenoMarkAllAsOpenedBtn');
    var inAppPauseToggle = document.getElementById('retenoInAppPauseToggle');
    var inAppPauseBehaviourEl = document.getElementById('retenoInAppPauseBehaviour');
    var inAppPauseBehaviourBtn = document.getElementById('retenoInAppPauseBehaviourBtn');
    var inAppStatusEl = document.getElementById('retenoInAppStatus');
    var inAppLifecycleToggle = document.getElementById('retenoInAppLifecycleToggle');
    var inAppCustomDataToggle = document.getElementById('retenoInAppCustomDataToggle');
    var inAppLifecycleStatusEl = document.getElementById('retenoInAppLifecycleStatus');
    var inAppCustomDataStatusEl = document.getElementById('retenoInAppCustomDataStatus');
    var inAppLifecycleListEl = document.getElementById('retenoInAppLifecycleList');
    var inAppCustomDataListEl = document.getElementById('retenoInAppCustomDataList');
    var initPauseInAppEl = document.getElementById('retenoInitPauseInAppMessages');
    var initPausePushInAppEl = document.getElementById('retenoInitPausePushInAppMessages');
    var initLifecycleAppEl = document.getElementById('retenoInitLifecycleApp');
    var initLifecyclePushEl = document.getElementById('retenoInitLifecyclePush');
    var initLifecycleSessionEl = document.getElementById('retenoInitLifecycleSession');
    var initScreenReportingEl = document.getElementById('retenoInitScreenReporting');
    var initScreenReportingRowEl = document.getElementById('retenoInitScreenReportingRow');

    if (initScreenReportingRowEl && cordova && cordova.platformId !== 'ios') {
        initScreenReportingRowEl.style.display = 'none';
    }

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

    var eventNameEl = document.getElementById('retenoEventName');
    var eventDateEl = document.getElementById('retenoEventDate');
    var eventParamKeyEl = document.getElementById('retenoEventParamKey');
    var eventParamValueEl = document.getElementById('retenoEventParamValue');
    var forcePushDataBtn = document.getElementById('retenoForcePushDataBtn');
    var forcePushDataHomeBtn = document.getElementById('retenoForcePushDataHomeBtn');

    var lifecycleAppEl = document.getElementById('retenoLifecycleApp');
    var lifecyclePushEl = document.getElementById('retenoLifecyclePush');
    var lifecycleSessionEl = document.getElementById('retenoLifecycleSession');
    var notificationNameEl = document.getElementById('retenoNotificationName');
    var notificationDescriptionEl = document.getElementById('retenoNotificationDescription');
    var iosNotificationHandlersEl = document.getElementById('retenoIosNotificationHandlers');

    if (iosNotificationHandlersEl && cordova && cordova.platformId !== 'ios') {
        iosNotificationHandlersEl.style.display = 'none';
    }

    var willPresentToggle = document.getElementById('retenoWillPresentToggle');
    var willPresentEmitToggle = document.getElementById('retenoWillPresentEmitToggle');
    var didReceiveToggle = document.getElementById('retenoDidReceiveToggle');
    var didReceiveEmitToggle = document.getElementById('retenoDidReceiveEmitToggle');
    var iosNotificationStatusEl = document.getElementById('retenoIosNotificationStatus');

    var externalUserGroupEl = document.querySelector('[data-field-group="external-user-id"]');
    var emailGroupEl = document.querySelector('[data-field-group="email"]');
    var phoneGroupEl = document.querySelector('[data-field-group="phone"]');
    var lastMultiAccountUserId = null;

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

    if (eventNameEl && !String(eventNameEl.value || '').trim()) eventNameEl.value = 'purchase';
    if (eventDateEl && !String(eventDateEl.value || '').trim()) eventDateEl.value = new Date().toISOString();
    if (eventParamKeyEl && !String(eventParamKeyEl.value || '').trim()) eventParamKeyEl.value = 'orderId';
    if (eventParamValueEl && !String(eventParamValueEl.value || '').trim()) eventParamValueEl.value = 'A-123';
    if (lifecycleAppEl && !lifecycleAppEl.checked) lifecycleAppEl.checked = true;
    if (lifecyclePushEl && !lifecyclePushEl.checked) lifecyclePushEl.checked = true;
    if (lifecycleSessionEl && !lifecycleSessionEl.checked) lifecycleSessionEl.checked = true;
    if (initLifecycleAppEl && !initLifecycleAppEl.checked) initLifecycleAppEl.checked = true;
    if (initLifecyclePushEl && !initLifecyclePushEl.checked) initLifecyclePushEl.checked = true;
    if (initLifecycleSessionEl && !initLifecycleSessionEl.checked) initLifecycleSessionEl.checked = true;
    if (initPauseInAppEl && initPauseInAppEl.checked) initPauseInAppEl.checked = false;
    if (initPausePushInAppEl && initPausePushInAppEl.checked) initPausePushInAppEl.checked = false;
    if (inAppPauseToggle && inAppPauseToggle.checked) inAppPauseToggle.checked = false;
    if (inAppPauseBehaviourEl && !String(inAppPauseBehaviourEl.value || '').trim()) {
        inAppPauseBehaviourEl.value = 'POSTPONE_IN_APPS';
    }
    if (notificationNameEl && !String(notificationNameEl.value || '').trim()) notificationNameEl.value = 'Updates';
    if (notificationDescriptionEl && !String(notificationDescriptionEl.value || '').trim()) {
        notificationDescriptionEl.value = 'General updates and announcements';
    }
    if (recomVariantIdEl && !String(recomVariantIdEl.value || '').trim()) {
        recomVariantIdEl.value = 'demo_recom_variant';
    }
    if (recomLogVariantIdEl && !String(recomLogVariantIdEl.value || '').trim()) {
        recomLogVariantIdEl.value = recomVariantIdEl ? String(recomVariantIdEl.value || '').trim() : 'demo_recom_variant';
    }
    if (recomLogEventTypeEl && !String(recomLogEventTypeEl.value || '').trim()) {
        recomLogEventTypeEl.value = 'IMPRESSIONS';
    }
    if (inboxPageEl && !String(inboxPageEl.value || '').trim()) inboxPageEl.value = '1';
    if (inboxPageSizeEl && !String(inboxPageSizeEl.value || '').trim()) inboxPageSizeEl.value = '20';

    function setStatus(text) {
        if (statusEl) {
            statusEl.textContent = text;
        }
    }

    function setEventStatus(text) {
        if (eventStatusEl) {
            eventStatusEl.textContent = text;
        }
    }

    function setLifecycleStatus(text) {
        if (lifecycleStatusEl) {
            lifecycleStatusEl.textContent = text;
        }
    }

    function setNotificationStatus(text) {
        if (notificationStatusEl) {
            notificationStatusEl.textContent = text;
        }
    }

    function setIosNotificationStatus(text) {
        if (iosNotificationStatusEl) {
            iosNotificationStatusEl.textContent = text;
        }
    }

    function setInboxStatus(text) {
        if (inboxStatusEl) {
            inboxStatusEl.textContent = text;
        }
    }

    function setInboxCount(text) {
        if (inboxCountEl) {
            inboxCountEl.textContent = text;
        }
    }

    function setInboxMarkStatus(text) {
        if (inboxMarkStatusEl) {
            inboxMarkStatusEl.textContent = text;
        }
    }

    function setRecommendationsStatus(text) {
        if (recomStatusEl) {
            recomStatusEl.textContent = text;
        }
    }

    function setRecommendationsLogStatus(text) {
        if (recomLogStatusEl) {
            recomLogStatusEl.textContent = text;
        }
    }

    function setEcomStatus(text) {
        if (ecomStatusEl) {
            ecomStatusEl.textContent = text;
        }
    }

    function setInAppStatus(text) {
        if (inAppStatusEl) {
            inAppStatusEl.textContent = text;
        }
    }

    function setInitOptionsVisible(isVisible) {
        if (!initOptionsSectionEl) {
            return;
        }
        initOptionsSectionEl.style.display = isVisible ? '' : 'none';
    }

    function setInAppLifecycleStatus(text) {
        if (inAppLifecycleStatusEl) {
            inAppLifecycleStatusEl.textContent = text;
        }
    }

    function setInAppCustomDataStatus(text) {
        if (inAppCustomDataStatusEl) {
            inAppCustomDataStatusEl.textContent = text;
        }
    }

    function setPushReceivedEvent(text) {
        if (pushReceivedEventEl) {
            pushReceivedEventEl.textContent = text;
        }
    }

    function setNotificationClickedEvent(text) {
        if (notificationClickedEventEl) {
            notificationClickedEventEl.textContent = text;
        }
    }

    function setPushDismissedEvent(text) {
        if (pushDismissedEventEl) {
            pushDismissedEventEl.textContent = text;
        }
    }

    function setCustomPushReceivedEvent(text) {
        if (customPushReceivedEventEl) {
            customPushReceivedEventEl.textContent = text;
        }
    }

    function setPushButtonClickedEvent(text) {
        if (pushButtonClickedEventEl) {
            pushButtonClickedEventEl.textContent = text;
        }
    }

    function getRetenoSdk() {
        return (window && window.retenosdk) ? window.retenosdk : null;
    }

    function setFieldGroupVisibility(groupEl, isVisible) {
        if (!groupEl) return;
        groupEl.classList.toggle('field-hidden', !isVisible);
        var inputs = groupEl.querySelectorAll('input, select, textarea');
        inputs.forEach(function (input) {
            input.disabled = !isVisible;
        });
    }

    function updateUserFormMode(origin) {
        if (origin === 'anonymous' && anonymousUserEl && anonymousUserEl.checked && multiAccountEl) {
            multiAccountEl.checked = false;
        }
        if (origin === 'multi' && multiAccountEl && multiAccountEl.checked && anonymousUserEl) {
            anonymousUserEl.checked = false;
        }

        var isAnonymous = !!(anonymousUserEl && anonymousUserEl.checked);
        setFieldGroupVisibility(externalUserGroupEl, !isAnonymous);
        setFieldGroupVisibility(emailGroupEl, !isAnonymous);
        setFieldGroupVisibility(phoneGroupEl, !isAnonymous);
        if (!(multiAccountEl && multiAccountEl.checked)) {
            lastMultiAccountUserId = null;
        }
    }

    function parseCsv(value) {
        if (!value) {
            return [];
        }
        return String(value)
            .split(',')
            .map(function (item) { return item.trim(); })
            .filter(function (item) { return item.length > 0; });
    }

    function safeStringify(payload) {
        try {
            return JSON.stringify(payload);
        } catch (err) {
            return String(payload);
        }
    }

    function appendEventItem(listEl, text) {
        if (!listEl) return;
        var item = document.createElement('li');
        item.textContent = text;
        if (listEl.firstChild) {
            listEl.insertBefore(item, listEl.firstChild);
        } else {
            listEl.appendChild(item);
        }
    }

    function buildEcomPayload(eventType) {
        var occurred = new Date().toISOString();
        switch (eventType) {
            case 'productCategoryViewed':
                return {
                    eventType: 'productCategoryViewed',
                    category: {
                        productCategoryId: 'category-1',
                        attributes: [{ name: 'department', value: ['shoes'] }],
                    },
                    occurred: occurred,
                };
            case 'productAddedToWishlist':
                return {
                    eventType: 'productAddedToWishlist',
                    product: {
                        productId: 'sku-2',
                        price: 149.99,
                        isInStock: true,
                        attributes: [{ name: 'color', value: ['blue'] }],
                    },
                    currencyCode: 'USD',
                    occurred: occurred,
                };
            case 'cartUpdated':
                return {
                    eventType: 'cartUpdated',
                    cartId: 'cart-123',
                    products: [
                        {
                            productId: 'sku-1',
                            quantity: 2,
                            price: 89.5,
                            discount: 10,
                            name: 'Sneakers',
                            category: 'Shoes',
                            attributes: [{ name: 'size', value: ['42'] }],
                        },
                    ],
                    currencyCode: 'USD',
                    occurred: occurred,
                };
            case 'orderCreated':
            case 'orderUpdated':
                return {
                    eventType: eventType,
                    order: {
                        externalOrderId: 'order-1001',
                        externalCustomerId: 'customer-77',
                        totalCost: 199.99,
                        status: 'IN_PROGRESS',
                        date: occurred,
                        cartId: 'cart-123',
                        email: 'john.doe@example.com',
                        phone: '+1234567890',
                        items: [
                            {
                                externalItemId: 'sku-1',
                                name: 'Sneakers',
                                category: 'Shoes',
                                quantity: 1,
                                cost: 99.99,
                                url: 'https://example.com/products/sku-1',
                                imageUrl: 'https://example.com/images/sku-1.png',
                            },
                        ],
                        attributes: [{ key: 'promo', value: 'newyear' }],
                    },
                    currencyCode: 'USD',
                    occurred: occurred,
                };
            case 'orderDelivered':
                return {
                    eventType: 'orderDelivered',
                    externalOrderId: 'order-1001',
                    occurred: occurred,
                };
            case 'orderCancelled':
                return {
                    eventType: 'orderCancelled',
                    externalOrderId: 'order-1001',
                    occurred: occurred,
                };
            case 'searchRequest':
                return {
                    eventType: 'searchRequest',
                    search: 'running shoes',
                    isFound: true,
                    occurred: occurred,
                };
            case 'productViewed':
            default:
                return {
                    eventType: 'productViewed',
                    product: {
                        productId: 'sku-1',
                        price: 99.99,
                        isInStock: true,
                        attributes: [{ name: 'color', value: ['red'] }],
                    },
                    currencyCode: 'USD',
                    occurred: occurred,
                };
        }
    }

    function renderInboxMessages(messages) {
        if (!inboxMessagesListEl) return;
        inboxMessagesListEl.innerHTML = '';
        if (!messages || !messages.length) {
            return;
        }
        messages.forEach(function (message) {
            var id = message && message.id ? message.id : 'unknown';
            var title = message && message.title ? message.title : '';
            var status = message && message.status ? message.status : '';
            var created = message && message.createdDate ? message.createdDate : '';
            var label = 'id: ' + id;
            if (title) label += ' | title: ' + title;
            if (status) label += ' | status: ' + status;
            if (created) label += ' | created: ' + created;
            appendEventItem(inboxMessagesListEl, label);
        });
    }

    function renderRecommendations(recoms) {
        if (!recomListEl) return;
        recomListEl.innerHTML = '';
        if (!recoms || !recoms.length) {
            return;
        }
        recoms.forEach(function (item, index) {
            var productId = item && item.productId ? item.productId : ('item-' + (index + 1));
            var label = 'productId: ' + productId;
            if (item && typeof item === 'object') {
                label += ' | data: ' + safeStringify(item);
            }
            appendEventItem(recomListEl, label);
        });
    }

    var pushReceivedHandler = null;
    var notificationClickedHandler = null;
    var pushDismissedHandler = null;
    var customPushReceivedHandler = null;
    var pushButtonClickedHandler = null;
    var inboxCountSubscribed = false;
    var inboxCountHandler = null;
    var inAppLifecycleHandler = null;
    var inAppCustomDataHandler = null;
    var lastRecommendationProductIds = [];
    var demoInitialized = false;

    function logScreenView(screenName) {
        var sdk = getRetenoSdk();
        if (!sdk || typeof sdk.logScreenView !== 'function') {
            return;
        }

        sdk.logScreenView(screenName).catch(function (err) {
            console.warn('logScreenView: error', err);
        });
    }

    var pageEls = Array.prototype.slice.call(document.querySelectorAll('.page'));
    var pageByName = {};
    pageEls.forEach(function (pageEl) {
        var name = pageEl.getAttribute('data-page');
        if (name) {
            pageByName[name] = pageEl;
        }
    });

    function showPage(pageName) {
        var fallbackName = pageByName.home ? 'home' : (pageEls[0] ? pageEls[0].getAttribute('data-page') : '');
        var name = pageByName[pageName] ? pageName : fallbackName;
        var activePage = pageByName[name];

        pageEls.forEach(function (pageEl) {
            pageEl.classList.toggle('is-active', pageEl === activePage);
        });

        if (activePage) {
            var screenName = activePage.getAttribute('data-screen-name') || name;
            if (screenName) {
                logScreenView(screenName);
            }
        }
    }

    var navButtons = document.querySelectorAll('[data-target]');
    var initPromise = null;

    function buildInitOptions() {
        return {
            pauseInAppMessages: !!(initPauseInAppEl && initPauseInAppEl.checked),
            pausePushInAppMessages: !!(initPausePushInAppEl && initPausePushInAppEl.checked),
            isAutomaticScreenReportingEnabled: !!(initScreenReportingEl && initScreenReportingEl.checked),
            isDebugMode: true,
            lifecycleTrackingOptions: {
                appLifecycleEnabled: !!(initLifecycleAppEl && initLifecycleAppEl.checked),
                pushSubscriptionEnabled: !!(initLifecyclePushEl && initLifecyclePushEl.checked),
                sessionEventsEnabled: !!(initLifecycleSessionEl && initLifecycleSessionEl.checked),
            },
        };
    }

    function ensureInit() {
        if (demoInitialized) {
            return Promise.resolve();
        }
        if (initPromise) {
            return initPromise;
        }
        var sdk = getRetenoSdk();
        if (!sdk || typeof sdk.init !== 'function') {
            return Promise.reject(new Error('Reteno SDK is not available (window.retenosdk missing).'));
        }
        initPromise = sdk
            .init(buildInitOptions())
            .then(function () {
                demoInitialized = true;
                initPromise = null;
                setInitOptionsVisible(false);
            })
            .catch(function (err) {
                initPromise = null;
                throw err;
            });
        return initPromise;
    }

    function withInit(action, onError) {
        ensureInit()
            .then(action)
            .catch(function (err) {
                if (typeof onError === 'function') {
                    onError(err);
                }
            });
    }

    setInitOptionsVisible(true);
    navButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            var target = button.getAttribute('data-target');
            if (target) {
                showPage(target);
            }
        });
    });

    if (multiAccountEl) {
        multiAccountEl.addEventListener('change', function () {
            updateUserFormMode('multi');
        });
    }
    if (anonymousUserEl) {
        anonymousUserEl.addEventListener('change', function () {
            updateUserFormMode('anonymous');
        });
    }

    showPage('home');
    updateUserFormMode();

    function applyWillPresentOptions() {
        var sdk = getRetenoSdk();
        if (!sdk || typeof sdk.setWillPresentNotificationOptions !== 'function') {
            setIosNotificationStatus('setWillPresentNotificationOptions: not available.');
            return;
        }
        if (!willPresentToggle || !willPresentToggle.checked) {
            sdk.setWillPresentNotificationOptions(null);
            setIosNotificationStatus('setWillPresentNotificationOptions: removed.');
            return;
        }
        var emitEvent = !!(willPresentEmitToggle && willPresentEmitToggle.checked);
        sdk.setWillPresentNotificationOptions({
            options: ['badge', 'sound', 'banner'],
            emitEvent: emitEvent
        }).then(function () {
            setIosNotificationStatus('setWillPresentNotificationOptions: OK.');
        }).catch(function (err) {
            setIosNotificationStatus('setWillPresentNotificationOptions: ERROR.');
            console.warn('setWillPresentNotificationOptions error', err);
        });
    }

    function applyDidReceiveHandler() {
        var sdk = getRetenoSdk();
        if (!sdk || typeof sdk.setDidReceiveNotificationResponseHandler !== 'function') {
            setIosNotificationStatus('setDidReceiveNotificationResponseHandler: not available.');
            return;
        }
        var enabled = !!(didReceiveToggle && didReceiveToggle.checked);
        var emitEvent = !!(didReceiveEmitToggle && didReceiveEmitToggle.checked);
        sdk.setDidReceiveNotificationResponseHandler({
            enabled: enabled,
            emitEvent: emitEvent
        }).then(function () {
            setIosNotificationStatus(
                enabled ? 'setDidReceiveNotificationResponseHandler: enabled.' : 'setDidReceiveNotificationResponseHandler: removed.'
            );
        }).catch(function (err) {
            setIosNotificationStatus('setDidReceiveNotificationResponseHandler: ERROR.');
            console.warn('setDidReceiveNotificationResponseHandler error', err);
        });
    }

    if (btn) {
        btn.addEventListener('click', function () {
            withInit(function () {
                var isMultiAccount = !!(multiAccountEl && multiAccountEl.checked);
                var isAnonymous = !!(anonymousUserEl && anonymousUserEl.checked);
                var sdk = getRetenoSdk();
                var methodName = isAnonymous
                    ? 'setAnonymousUserAttributes'
                    : (isMultiAccount ? 'setMultiAccountUserAttributes' : 'setUserAttributes');

                if (!sdk || typeof sdk[methodName] !== 'function') {
                    setStatus('Reteno ' + methodName + ' is not available.');
                    return;
                }
                var externalUserId = externalUserIdEl ? String(externalUserIdEl.value || '').trim() : '';
                if (!isAnonymous && !externalUserId) {
                    setStatus('Please provide externalUserId.');
                    return;
                }

                function read(el) {
                    return el ? String(el.value || '').trim() : '';
                }

                var userAttributes = {};
                var email = isAnonymous ? '' : read(emailEl);
                var phone = isAnonymous ? '' : read(phoneEl);
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

                if (isAnonymous) {
                    setStatus('Sending setAnonymousUserAttributes...');
                    sdk.setAnonymousUserAttributes(userAttributes)
                        .then(function () {
                            setStatus('setAnonymousUserAttributes: success');
                        })
                        .catch(function (err) {
                            setStatus(
                                'setAnonymousUserAttributes: error: ' +
                                    (err && err.message ? err.message : String(err))
                            );
                        });
                } else if (isMultiAccount) {
                    var previousUserId = lastMultiAccountUserId;
                    var nextUserId = externalUserId;
                    var multiAccountUser = Object.keys(userAttributes).length > 0
                        ? { userAttributes: userAttributes }
                        : {};
                    setStatus('Sending setMultiAccountUserAttributes...');
                    sdk.setMultiAccountUserAttributes({
                        externalUserId: externalUserId,
                        user: multiAccountUser,
                    })
                        .then(function () {
                            lastMultiAccountUserId = nextUserId;
                            if (previousUserId && previousUserId !== nextUserId) {
                                setStatus(
                                    'setMultiAccountUserAttributes: success (session switch ' +
                                        previousUserId +
                                        ' -> ' +
                                        nextUserId +
                                        ')'
                                );
                                return;
                            }
                            setStatus('setMultiAccountUserAttributes: success');
                        })
                        .catch(function (err) {
                            setStatus(
                                'setMultiAccountUserAttributes: error: ' +
                                    (err && err.message ? err.message : String(err))
                            );
                        });
                } else {
                    // `user` is optional; only send when at least one attribute is present.
                    var user = null;
                    if (Object.keys(userAttributes).length > 0) {
                        user = { userAttributes: userAttributes };
                    }
                    setStatus('Sending setUserAttributes...');
                    sdk.setUserAttributes({
                        externalUserId: externalUserId,
                        user: user,
                    })
                        .then(function () {
                            setStatus('setUserAttributes: success');
                        })
                        .catch(function (err) {
                            setStatus('setUserAttributes: error: ' + (err && err.message ? err.message : String(err)));
                        });
                }
            }, function (err) {
                setStatus('Reteno init error: ' + (err && err.message ? err.message : String(err)));
            });
        });
    }

    if (willPresentToggle) {
        willPresentToggle.addEventListener('change', function () {
            withInit(function () {
                applyWillPresentOptions();
                return Promise.resolve();
            });
        });
    }
    if (willPresentEmitToggle) {
        willPresentEmitToggle.addEventListener('change', function () {
            withInit(function () {
                applyWillPresentOptions();
                return Promise.resolve();
            });
        });
    }
    if (didReceiveToggle) {
        didReceiveToggle.addEventListener('change', function () {
            withInit(function () {
                applyDidReceiveHandler();
                return Promise.resolve();
            });
        });
    }
    if (didReceiveEmitToggle) {
        didReceiveEmitToggle.addEventListener('change', function () {
            withInit(function () {
                applyDidReceiveHandler();
                return Promise.resolve();
            });
        });
    }

    if (logEventBtn) {
        logEventBtn.addEventListener('click', function () {
            withInit(function () {
                var sdk = getRetenoSdk();
                if (!sdk || typeof sdk.logEvent !== 'function') {
                    setEventStatus('Reteno logEvent is not available.');
                    return;
                }

                function read(el) {
                    return el ? String(el.value || '').trim() : '';
                }

                var eventName = read(eventNameEl);
                if (!eventName) {
                    setEventStatus('Please provide eventName.');
                    return;
                }

                var date = read(eventDateEl) || new Date().toISOString();
                if (eventDateEl && !eventDateEl.value) {
                    eventDateEl.value = date;
                }

                var payload = {
                    eventName: eventName,
                    date: date,
                };

                var paramKey = read(eventParamKeyEl);
                var paramValue = read(eventParamValueEl);
                if (paramKey && paramValue) {
                    payload.parameters = [{ name: paramKey, value: paramValue }];
                }

                setEventStatus('Sending logEvent...');
                sdk.logEvent(payload)
                    .then(function () {
                        setEventStatus('logEvent: success');
                    })
                    .catch(function (err) {
                        setEventStatus('logEvent: error: ' + (err && err.message ? err.message : String(err)));
                    });
            }, function (err) {
                setEventStatus('Reteno init error: ' + (err && err.message ? err.message : String(err)));
            });
        });
    }

    if (forcePushDataBtn) {
        forcePushDataBtn.addEventListener('click', function () {
            withInit(function () {
                var sdk = getRetenoSdk();
                if (!sdk || typeof sdk.forcePushData !== 'function') {
                    setEventStatus('Reteno forcePushData is not available.');
                    return;
                }

                setEventStatus('Sending forcePushData...');
                sdk.forcePushData()
                    .then(function () {
                        setEventStatus('forcePushData: success');
                    })
                    .catch(function (err) {
                        setEventStatus('forcePushData: error: ' + (err && err.message ? err.message : String(err)));
                    });
            }, function (err) {
                setEventStatus('Reteno init error: ' + (err && err.message ? err.message : String(err)));
            });
        });
    }

    if (forcePushDataHomeBtn) {
        forcePushDataHomeBtn.addEventListener('click', function () {
            withInit(function () {
                var sdk = getRetenoSdk();
                if (!sdk || typeof sdk.forcePushData !== 'function') {
                    return;
                }

                sdk.forcePushData()
                    .catch(function (err) {
                        console.warn('forcePushData: error', err);
                    });
            }, function (err) {
                console.warn('Reteno init error', err);
            });
        });
    }

    if (lifecycleSaveBtn) {
        lifecycleSaveBtn.addEventListener('click', function () {
            if (cordova && cordova.platformId === 'ios') {
                setLifecycleStatus('iOS: configure lifecycle tracking only in init options.');
                return;
            }

            withInit(function () {
                var sdk = getRetenoSdk();
                if (!sdk || typeof sdk.setLifecycleTrackingOptions !== 'function') {
                    setLifecycleStatus('Reteno setLifecycleTrackingOptions is not available.');
                    return;
                }

                var options = {
                    appLifecycleEnabled: !!(lifecycleAppEl && lifecycleAppEl.checked),
                    pushSubscriptionEnabled: !!(lifecyclePushEl && lifecyclePushEl.checked),
                    sessionEventsEnabled: !!(lifecycleSessionEl && lifecycleSessionEl.checked),
                };

                setLifecycleStatus('Saving...');
                sdk.setLifecycleTrackingOptions(options)
                    .then(function () {
                        setLifecycleStatus('setLifecycleTrackingOptions: success');
                    })
                    .catch(function (err) {
                        setLifecycleStatus(
                            'setLifecycleTrackingOptions: error: ' +
                                (err && err.message ? err.message : String(err))
                        );
                    });
            }, function (err) {
                setLifecycleStatus('Reteno init error: ' + (err && err.message ? err.message : String(err)));
            });
        });
    }

    if (lifecycleAllBtn) {
        lifecycleAllBtn.addEventListener('click', function () {
            if (cordova && cordova.platformId === 'ios') {
                setLifecycleStatus('iOS: configure lifecycle tracking only in init options.');
                return;
            }

            withInit(function () {
                var sdk = getRetenoSdk();
                if (!sdk || typeof sdk.setLifecycleTrackingOptions !== 'function') {
                    setLifecycleStatus('Reteno setLifecycleTrackingOptions is not available.');
                    return;
                }

                setLifecycleStatus('Saving...');
                sdk.setLifecycleTrackingOptions('ALL')
                    .then(function () {
                        if (lifecycleAppEl) lifecycleAppEl.checked = true;
                        if (lifecyclePushEl) lifecyclePushEl.checked = true;
                        if (lifecycleSessionEl) lifecycleSessionEl.checked = true;
                        setLifecycleStatus('setLifecycleTrackingOptions: success (ALL)');
                    })
                    .catch(function (err) {
                        setLifecycleStatus(
                            'setLifecycleTrackingOptions: error: ' +
                                (err && err.message ? err.message : String(err))
                        );
                    });
            }, function (err) {
                setLifecycleStatus('Reteno init error: ' + (err && err.message ? err.message : String(err)));
            });
        });
    }

    if (lifecycleNoneBtn) {
        lifecycleNoneBtn.addEventListener('click', function () {
            if (cordova && cordova.platformId === 'ios') {
                setLifecycleStatus('iOS: configure lifecycle tracking only in init options.');
                return;
            }

            withInit(function () {
                var sdk = getRetenoSdk();
                if (!sdk || typeof sdk.setLifecycleTrackingOptions !== 'function') {
                    setLifecycleStatus('Reteno setLifecycleTrackingOptions is not available.');
                    return;
                }

                setLifecycleStatus('Saving...');
                sdk.setLifecycleTrackingOptions('NONE')
                    .then(function () {
                        if (lifecycleAppEl) lifecycleAppEl.checked = false;
                        if (lifecyclePushEl) lifecyclePushEl.checked = false;
                        if (lifecycleSessionEl) lifecycleSessionEl.checked = false;
                        setLifecycleStatus('setLifecycleTrackingOptions: success (NONE)');
                    })
                    .catch(function (err) {
                        setLifecycleStatus(
                            'setLifecycleTrackingOptions: error: ' +
                                (err && err.message ? err.message : String(err))
                        );
                    });
            }, function (err) {
                setLifecycleStatus('Reteno init error: ' + (err && err.message ? err.message : String(err)));
            });
        });
    }

    if (notificationApplyBtn) {
        notificationApplyBtn.addEventListener('click', function () {
            withInit(function () {
                var sdk = getRetenoSdk();
                if (!sdk || typeof sdk.updateDefaultNotificationChannel !== 'function') {
                    setNotificationStatus('Reteno updateDefaultNotificationChannel is not available.');
                    return;
                }

                var name = notificationNameEl ? String(notificationNameEl.value || '').trim() : '';
                var description = notificationDescriptionEl ? String(notificationDescriptionEl.value || '').trim() : '';
                if (!name || !description) {
                    setNotificationStatus('Please provide name and description.');
                    return;
                }

                setNotificationStatus('Applying...');
                sdk.updateDefaultNotificationChannel({ name: name, description: description })
                    .then(function () {
                        setNotificationStatus('updateDefaultNotificationChannel: success');
                    })
                    .catch(function (err) {
                        setNotificationStatus(
                            'updateDefaultNotificationChannel: error: ' +
                                (err && err.message ? err.message : String(err))
                        );
                    });
            }, function (err) {
                setNotificationStatus('Reteno init error: ' + (err && err.message ? err.message : String(err)));
            });
        });
    }

    if (pushReceivedListenerToggle) {
        pushReceivedListenerToggle.addEventListener('change', function () {
            if (pushReceivedListenerToggle.checked) {
                withInit(function () {
                    var sdk = getRetenoSdk();
                    if (!sdk || typeof sdk.setOnRetenoPushReceivedListener !== 'function') {
                        setPushReceivedEvent('setOnRetenoPushReceivedListener: not available.');
                        pushReceivedListenerToggle.checked = false;
                        return;
                    }

                    if (!pushReceivedHandler) {
                        pushReceivedHandler = function (event) {
                            var detail = event && event.detail !== undefined ? event.detail : event;
                            var message = 'Push received event: ' + safeStringify(detail);
                            appendEventItem(pushReceivedEventListEl, message);
                        };
                        sdk.setOnRetenoPushReceivedListener(pushReceivedHandler);
                        setPushReceivedEvent('Listening for push received events...');
                    }
                }, function (err) {
                    pushReceivedListenerToggle.checked = false;
                    setPushReceivedEvent('Reteno init error: ' + (err && err.message ? err.message : String(err)));
                });
                return;
            }

            if (pushReceivedHandler) {
                var sdk = getRetenoSdk();
                if (sdk && typeof sdk.removeOnRetenoPushReceivedListener === 'function') {
                    sdk.removeOnRetenoPushReceivedListener(pushReceivedHandler);
                } else {
                    document.removeEventListener('reteno-push-received', pushReceivedHandler);
                }
                pushReceivedHandler = null;
                setPushReceivedEvent('Push received listener removed.');
            }
        });
    }

    if (notificationClickedListenerToggle) {
        notificationClickedListenerToggle.addEventListener('change', function () {
            if (notificationClickedListenerToggle.checked) {
                withInit(function () {
                    var sdk = getRetenoSdk();
                    if (!sdk || typeof sdk.setOnRetenoNotificationClickedListener !== 'function') {
                        setNotificationClickedEvent('setOnRetenoNotificationClickedListener: not available.');
                        notificationClickedListenerToggle.checked = false;
                        return;
                    }

                    if (!notificationClickedHandler) {
                        notificationClickedHandler = function (event) {
                            var detail = event && event.detail !== undefined ? event.detail : event;
                            var message = 'Notification clicked event: ' + safeStringify(detail);
                            appendEventItem(notificationClickedEventListEl, message);
                        };
                        sdk.setOnRetenoNotificationClickedListener(notificationClickedHandler);
                        setNotificationClickedEvent('Listening for notification click events...');
                    }
                }, function (err) {
                    notificationClickedListenerToggle.checked = false;
                    setNotificationClickedEvent('Reteno init error: ' + (err && err.message ? err.message : String(err)));
                });
                return;
            }

            if (notificationClickedHandler) {
                var sdk = getRetenoSdk();
                if (sdk && typeof sdk.removeOnRetenoNotificationClickedListener === 'function') {
                    sdk.removeOnRetenoNotificationClickedListener(notificationClickedHandler);
                } else {
                    document.removeEventListener('reteno-notification-clicked', notificationClickedHandler);
                }
                notificationClickedHandler = null;
                setNotificationClickedEvent('Notification click listener removed.');
            }
        });
    }

    if (pushDismissedListenerToggle) {
        pushDismissedListenerToggle.addEventListener('change', function () {
            if (pushDismissedListenerToggle.checked) {
                withInit(function () {
                    var sdk = getRetenoSdk();
                    if (!sdk || typeof sdk.setOnRetenoPushDismissedListener !== 'function') {
                        setPushDismissedEvent('setOnRetenoPushDismissedListener: not available (requires SDK 2.9.0+).');
                        pushDismissedListenerToggle.checked = false;
                        return;
                    }

                    if (!pushDismissedHandler) {
                        pushDismissedHandler = function (event) {
                            var detail = event && event.detail !== undefined ? event.detail : event;
                            var message = 'Push dismissed event: ' + safeStringify(detail);
                            appendEventItem(pushDismissedEventListEl, message);
                        };
                        sdk.setOnRetenoPushDismissedListener(pushDismissedHandler);
                        setPushDismissedEvent('Listening for push dismissed events...');
                    }
                }, function (err) {
                    pushDismissedListenerToggle.checked = false;
                    setPushDismissedEvent('Reteno init error: ' + (err && err.message ? err.message : String(err)));
                });
                return;
            }

            if (pushDismissedHandler) {
                var sdk = getRetenoSdk();
                if (sdk && typeof sdk.removeOnRetenoPushDismissedListener === 'function') {
                    sdk.removeOnRetenoPushDismissedListener(pushDismissedHandler);
                } else {
                    document.removeEventListener('reteno-push-dismissed', pushDismissedHandler);
                }
                pushDismissedHandler = null;
                setPushDismissedEvent('Push dismissed listener removed.');
            }
        });
    }

    if (customPushReceivedListenerToggle) {
        customPushReceivedListenerToggle.addEventListener('change', function () {
            if (customPushReceivedListenerToggle.checked) {
                withInit(function () {
                    var sdk = getRetenoSdk();
                    if (!sdk || typeof sdk.setOnRetenoCustomPushReceivedListener !== 'function') {
                        setCustomPushReceivedEvent('setOnRetenoCustomPushReceivedListener: not available (requires SDK 2.9.0+).');
                        customPushReceivedListenerToggle.checked = false;
                        return;
                    }

                    if (!customPushReceivedHandler) {
                        customPushReceivedHandler = function (event) {
                            var detail = event && event.detail !== undefined ? event.detail : event;
                            var message = 'Custom push received event: ' + safeStringify(detail);
                            appendEventItem(customPushReceivedEventListEl, message);
                        };
                        sdk.setOnRetenoCustomPushReceivedListener(customPushReceivedHandler);
                        setCustomPushReceivedEvent('Listening for custom push received events...');
                    }
                }, function (err) {
                    customPushReceivedListenerToggle.checked = false;
                    setCustomPushReceivedEvent('Reteno init error: ' + (err && err.message ? err.message : String(err)));
                });
                return;
            }

            if (customPushReceivedHandler) {
                var sdk = getRetenoSdk();
                if (sdk && typeof sdk.removeOnRetenoCustomPushReceivedListener === 'function') {
                    sdk.removeOnRetenoCustomPushReceivedListener(customPushReceivedHandler);
                } else {
                    document.removeEventListener('reteno-custom-push-received', customPushReceivedHandler);
                }
                customPushReceivedHandler = null;
                setCustomPushReceivedEvent('Custom push received listener removed.');
            }
        });
    }

    if (pushButtonClickedListenerToggle) {
        pushButtonClickedListenerToggle.addEventListener('change', function () {
            if (pushButtonClickedListenerToggle.checked) {
                withInit(function () {
                    var sdk = getRetenoSdk();
                    if (!sdk || typeof sdk.setOnRetenoPushButtonClickedListener !== 'function') {
                        setPushButtonClickedEvent('setOnRetenoPushButtonClickedListener: not available.');
                        pushButtonClickedListenerToggle.checked = false;
                        return;
                    }

                    // Enable the native action handler with event emission
                    if (typeof sdk.setNotificationActionHandler === 'function') {
                        sdk.setNotificationActionHandler({ enabled: true, emitEvent: true });
                    }

                    if (!pushButtonClickedHandler) {
                        pushButtonClickedHandler = function (event) {
                            var detail = event && event.detail !== undefined ? event.detail : event;
                            var message = 'Push button clicked event: ' + safeStringify(detail);
                            appendEventItem(pushButtonClickedEventListEl, message);
                        };
                        sdk.setOnRetenoPushButtonClickedListener(pushButtonClickedHandler);
                        setPushButtonClickedEvent('Listening for push button clicked events...');
                    }
                }, function (err) {
                    pushButtonClickedListenerToggle.checked = false;
                    setPushButtonClickedEvent('Reteno init error: ' + (err && err.message ? err.message : String(err)));
                });
                return;
            }

            if (pushButtonClickedHandler) {
                var sdk = getRetenoSdk();
                if (sdk && typeof sdk.removeOnRetenoPushButtonClickedListener === 'function') {
                    sdk.removeOnRetenoPushButtonClickedListener(pushButtonClickedHandler);
                } else {
                    document.removeEventListener('reteno-push-button-clicked', pushButtonClickedHandler);
                }
                // Disable the native action handler
                if (sdk && typeof sdk.setNotificationActionHandler === 'function') {
                    sdk.setNotificationActionHandler(false);
                }
                pushButtonClickedHandler = null;
                setPushButtonClickedEvent('Push button clicked listener removed.');
            }
        });
    }

    if (inAppPauseToggle) {
        inAppPauseToggle.addEventListener('change', function () {
            var shouldPause = !!inAppPauseToggle.checked;
            withInit(function () {
                var sdk = getRetenoSdk();
                if (!sdk || typeof sdk.pauseInAppMessages !== 'function') {
                    setInAppStatus('Reteno pauseInAppMessages is not available.');
                    inAppPauseToggle.checked = !shouldPause;
                    return;
                }
                setInAppStatus(shouldPause ? 'Pausing in-app messages...' : 'Resuming in-app messages...');
                sdk.pauseInAppMessages(shouldPause)
                    .then(function () {
                        setInAppStatus(shouldPause ? 'pauseInAppMessages: paused' : 'pauseInAppMessages: resumed');
                    })
                    .catch(function (err) {
                        inAppPauseToggle.checked = !shouldPause;
                        setInAppStatus('pauseInAppMessages: error: ' + (err && err.message ? err.message : String(err)));
                    });
            }, function (err) {
                inAppPauseToggle.checked = !shouldPause;
                setInAppStatus('Reteno init error: ' + (err && err.message ? err.message : String(err)));
            });
        });
    }

    if (inAppPauseBehaviourBtn) {
        inAppPauseBehaviourBtn.addEventListener('click', function () {
            withInit(function () {
                var sdk = getRetenoSdk();
                if (!sdk || typeof sdk.setInAppMessagesPauseBehaviour !== 'function') {
                    setInAppStatus('Reteno setInAppMessagesPauseBehaviour is not available.');
                    return;
                }
                var behaviour = inAppPauseBehaviourEl ? String(inAppPauseBehaviourEl.value || '').trim() : '';
                if (!behaviour) {
                    setInAppStatus('Please select pause behaviour.');
                    return;
                }
                setInAppStatus('Applying pause behaviour...');
                sdk.setInAppMessagesPauseBehaviour(behaviour)
                    .then(function () {
                        setInAppStatus('setInAppMessagesPauseBehaviour: OK');
                    })
                    .catch(function (err) {
                        setInAppStatus(
                            'setInAppMessagesPauseBehaviour: error: ' +
                                (err && err.message ? err.message : String(err))
                        );
                    });
            }, function (err) {
                setInAppStatus('Reteno init error: ' + (err && err.message ? err.message : String(err)));
            });
        });
    }

    if (inAppLifecycleToggle) {
        inAppLifecycleToggle.addEventListener('change', function () {
            if (inAppLifecycleToggle.checked) {
                withInit(function () {
                    var sdk = getRetenoSdk();
                    if (!sdk || typeof sdk.setOnInAppLifecycleCallback !== 'function') {
                        setInAppLifecycleStatus('setOnInAppLifecycleCallback: not available.');
                        inAppLifecycleToggle.checked = false;
                        return;
                    }

                    if (!inAppLifecycleHandler) {
                        inAppLifecycleHandler = function (event) {
                            var detail = event && event.detail !== undefined ? event.detail : event;
                            var message = 'In-app lifecycle event: ' + safeStringify(detail);
                            appendEventItem(inAppLifecycleListEl, message);
                        };
                        sdk.setOnInAppLifecycleCallback(inAppLifecycleHandler);
                        setInAppLifecycleStatus('Listening for in-app lifecycle events...');
                    }
                }, function (err) {
                    inAppLifecycleToggle.checked = false;
                    setInAppLifecycleStatus('Reteno init error: ' + (err && err.message ? err.message : String(err)));
                });
                return;
            }

            if (inAppLifecycleHandler) {
                var sdk = getRetenoSdk();
                if (sdk && typeof sdk.setOnInAppLifecycleCallback === 'function') {
                    sdk.setOnInAppLifecycleCallback(null);
                }
                document.removeEventListener('reteno-in-app-lifecycle', inAppLifecycleHandler);
                inAppLifecycleHandler = null;
                setInAppLifecycleStatus('In-app lifecycle listener removed.');
            }
        });
    }

    if (inAppCustomDataToggle) {
        inAppCustomDataToggle.addEventListener('change', function () {
            if (inAppCustomDataToggle.checked) {
                withInit(function () {
                    var sdk = getRetenoSdk();
                    if (
                        !sdk ||
                        (typeof sdk.setOnInAppMessageCustomDataReceivedListener !== 'function' &&
                            typeof sdk.removeOnInAppMessageCustomDataReceivedListener !== 'function')
                    ) {
                        setInAppCustomDataStatus('setOnInAppMessageCustomDataReceivedListener: not available.');
                        inAppCustomDataToggle.checked = false;
                        return;
                    }

                    if (!inAppCustomDataHandler) {
                        inAppCustomDataHandler = function (event) {
                            var detail = event && event.detail !== undefined ? event.detail : event;
                            var message = 'In-app custom data: ' + safeStringify(detail);
                            appendEventItem(inAppCustomDataListEl, message);
                        };
                        if (sdk && typeof sdk.setOnInAppMessageCustomDataReceivedListener === 'function') {
                            sdk.setOnInAppMessageCustomDataReceivedListener(inAppCustomDataHandler);
                        } else {
                            document.addEventListener('reteno-in-app-custom-data', inAppCustomDataHandler);
                        }
                        setInAppCustomDataStatus('Listening for in-app custom data events...');
                    }
                }, function (err) {
                    inAppCustomDataToggle.checked = false;
                    setInAppCustomDataStatus('Reteno init error: ' + (err && err.message ? err.message : String(err)));
                });
                return;
            }

            if (inAppCustomDataHandler) {
                var sdk = getRetenoSdk();
                if (sdk && typeof sdk.removeOnInAppMessageCustomDataReceivedListener === 'function') {
                    sdk.removeOnInAppMessageCustomDataReceivedListener(inAppCustomDataHandler);
                } else {
                    document.removeEventListener('reteno-in-app-custom-data', inAppCustomDataHandler);
                }
                inAppCustomDataHandler = null;
                setInAppCustomDataStatus('In-app custom data listener removed.');
            }
        });
    }

    if (getInboxMessagesBtn) {
        getInboxMessagesBtn.addEventListener('click', function () {
            withInit(function () {
                var sdk = getRetenoSdk();
                if (!sdk || typeof sdk.getAppInboxMessages !== 'function') {
                    setInboxStatus('Reteno getAppInboxMessages is not available.');
                    return;
                }

                var page = inboxPageEl ? parseInt(String(inboxPageEl.value || '').trim(), 10) : NaN;
                var pageSize = inboxPageSizeEl ? parseInt(String(inboxPageSizeEl.value || '').trim(), 10) : NaN;
                if (!page || page < 1 || Number.isNaN(page)) {
                    setInboxStatus('Please provide a valid page.');
                    return;
                }
                if (!pageSize || pageSize < 1 || Number.isNaN(pageSize)) {
                    setInboxStatus('Please provide a valid pageSize.');
                    return;
                }

                var statusValue = inboxStatusSelectEl ? String(inboxStatusSelectEl.value || '').trim() : '';
                var payload = { page: page, pageSize: pageSize };
                if (statusValue) {
                    payload.status = statusValue;
                }

                setInboxStatus('Fetching messages...');
                sdk.getAppInboxMessages(payload)
                    .then(function (result) {
                        var totalPages = result && result.totalPages !== undefined ? result.totalPages : '?';
                        var messages = result && result.messages ? result.messages : [];
                        setInboxStatus('getAppInboxMessages: OK (totalPages: ' + totalPages + ')');
                        renderInboxMessages(messages);
                    })
                    .catch(function (err) {
                        setInboxStatus('getAppInboxMessages: error: ' + (err && err.message ? err.message : String(err)));
                    });
            }, function (err) {
                setInboxStatus('Reteno init error: ' + (err && err.message ? err.message : String(err)));
            });
        });
    }

    if (getInboxCountBtn) {
        getInboxCountBtn.addEventListener('click', function () {
            withInit(function () {
                var sdk = getRetenoSdk();
                if (!sdk || typeof sdk.getAppInboxMessagesCount !== 'function') {
                    setInboxCount('Reteno getAppInboxMessagesCount is not available.');
                    return;
                }
                setInboxCount('Fetching count...');
                sdk.getAppInboxMessagesCount()
                    .then(function (count) {
                        setInboxCount('App Inbox count: ' + count);
                    })
                    .catch(function (err) {
                        setInboxCount(
                            'getAppInboxMessagesCount: error: ' + (err && err.message ? err.message : String(err))
                        );
                    });
            }, function (err) {
                setInboxCount('Reteno init error: ' + (err && err.message ? err.message : String(err)));
            });
        });
    }

    if (subscribeInboxCountBtn) {
        subscribeInboxCountBtn.addEventListener('click', function () {
            withInit(function () {
                var sdk = getRetenoSdk();
                if (!sdk || typeof sdk.subscribeOnMessagesCountChanged !== 'function') {
                    setInboxCount('Reteno subscribeOnMessagesCountChanged is not available.');
                    return;
                }
                if (inboxCountSubscribed) {
                    setInboxCount('Already subscribed to count updates.');
                    return;
                }
                inboxCountHandler = function (count) {
                    setInboxCount('App Inbox count: ' + count);
                };
                setInboxCount('Subscribing to count updates...');
                sdk.subscribeOnMessagesCountChanged(inboxCountHandler, function (err) {
                    setInboxCount(
                        'subscribeOnMessagesCountChanged: error: ' +
                            (err && err.message ? err.message : String(err))
                    );
                });
                inboxCountSubscribed = true;
            }, function (err) {
                setInboxCount('Reteno init error: ' + (err && err.message ? err.message : String(err)));
            });
        });
    }

    if (unsubscribeInboxCountBtn) {
        unsubscribeInboxCountBtn.addEventListener('click', function () {
            withInit(function () {
                var sdk = getRetenoSdk();
                if (!sdk || typeof sdk.unsubscribeMessagesCountChanged !== 'function') {
                    setInboxCount('Reteno unsubscribeMessagesCountChanged is not available.');
                    return;
                }
                sdk.unsubscribeMessagesCountChanged()
                    .then(function () {
                        inboxCountSubscribed = false;
                        inboxCountHandler = null;
                        setInboxCount('Unsubscribed from count updates.');
                    })
                    .catch(function (err) {
                        setInboxCount(
                            'unsubscribeMessagesCountChanged: error: ' +
                                (err && err.message ? err.message : String(err))
                        );
                    });
            }, function (err) {
                setInboxCount('Reteno init error: ' + (err && err.message ? err.message : String(err)));
            });
        });
    }

    if (markAsOpenedBtn) {
        markAsOpenedBtn.addEventListener('click', function () {
            withInit(function () {
                var sdk = getRetenoSdk();
                if (!sdk || typeof sdk.markAsOpened !== 'function') {
                    setInboxMarkStatus('Reteno markAsOpened is not available.');
                    return;
                }
                var messageId = inboxMessageIdEl ? String(inboxMessageIdEl.value || '').trim() : '';
                if (!messageId) {
                    setInboxMarkStatus('Please provide messageId.');
                    return;
                }
                setInboxMarkStatus('Marking message as opened...');
                sdk.markAsOpened(messageId)
                    .then(function () {
                        setInboxMarkStatus('markAsOpened: OK');
                    })
                    .catch(function (err) {
                        setInboxMarkStatus(
                            'markAsOpened: error: ' + (err && err.message ? err.message : String(err))
                        );
                    });
            }, function (err) {
                setInboxMarkStatus('Reteno init error: ' + (err && err.message ? err.message : String(err)));
            });
        });
    }

    if (markAllAsOpenedBtn) {
        markAllAsOpenedBtn.addEventListener('click', function () {
            withInit(function () {
                var sdk = getRetenoSdk();
                if (!sdk || typeof sdk.markAllMessagesAsOpened !== 'function') {
                    setInboxMarkStatus('Reteno markAllMessagesAsOpened is not available.');
                    return;
                }
                setInboxMarkStatus('Marking all messages as opened...');
                sdk.markAllMessagesAsOpened()
                    .then(function () {
                        setInboxMarkStatus('markAllMessagesAsOpened: OK');
                    })
                    .catch(function (err) {
                        setInboxMarkStatus(
                            'markAllMessagesAsOpened: error: ' + (err && err.message ? err.message : String(err))
                        );
                    });
            }, function (err) {
                setInboxMarkStatus('Reteno init error: ' + (err && err.message ? err.message : String(err)));
            });
        });
    }

    if (getRecommendationsBtn) {
        getRecommendationsBtn.addEventListener('click', function () {
            withInit(function () {
                var sdk = getRetenoSdk();
                if (!sdk || typeof sdk.getRecommendations !== 'function') {
                    setRecommendationsStatus('Reteno getRecommendations is not available.');
                    return;
                }

                var recomVariantId = recomVariantIdEl ? String(recomVariantIdEl.value || '').trim() : '';
                if (!recomVariantId) {
                    setRecommendationsStatus('Please provide recomVariantId.');
                    return;
                }

                var payload = { recomVariantId: recomVariantId };
                var productIds = parseCsv(recomProductIdsEl ? recomProductIdsEl.value : '');
                if (productIds.length) {
                    payload.productIds = productIds;
                }
                var categoryId = recomCategoryIdEl ? String(recomCategoryIdEl.value || '').trim() : '';
                if (categoryId) {
                    payload.categoryId = categoryId;
                }
                var fields = parseCsv(recomFieldsEl ? recomFieldsEl.value : '');
                if (fields.length) {
                    payload.fields = fields;
                }
                var filterName = recomFilterNameEl ? String(recomFilterNameEl.value || '').trim() : '';
                var filterValues = parseCsv(recomFilterValuesEl ? recomFilterValuesEl.value : '');
                if (filterName && filterValues.length) {
                    payload.filters = { name: filterName, values: filterValues };
                }

                setRecommendationsStatus('Fetching recommendations...');
                sdk.getRecommendations(payload)
                    .then(function (result) {
                        var recoms = result && result.recoms ? result.recoms : [];
                        if (!Array.isArray(recoms)) {
                            recoms = [];
                        }
                        renderRecommendations(recoms);
                        lastRecommendationProductIds = recoms
                            .map(function (item) { return item && item.productId ? String(item.productId) : ''; })
                            .filter(function (id) { return id; });
                        setRecommendationsStatus('getRecommendations: OK (' + recoms.length + ' items)');

                        if (recomLogVariantIdEl && !String(recomLogVariantIdEl.value || '').trim()) {
                            recomLogVariantIdEl.value = recomVariantId;
                        }
                        if (
                            recomLogProductIdsEl &&
                            !String(recomLogProductIdsEl.value || '').trim() &&
                            lastRecommendationProductIds.length
                        ) {
                            recomLogProductIdsEl.value = lastRecommendationProductIds.join(', ');
                        }
                    })
                    .catch(function (err) {
                        setRecommendationsStatus(
                            'getRecommendations: error: ' + (err && err.message ? err.message : String(err))
                        );
                    });
            }, function (err) {
                setRecommendationsStatus('Reteno init error: ' + (err && err.message ? err.message : String(err)));
            });
        });
    }

    if (logRecommendationsBtn) {
        logRecommendationsBtn.addEventListener('click', function () {
            withInit(function () {
                var sdk = getRetenoSdk();
                if (!sdk || typeof sdk.logRecommendations !== 'function') {
                    setRecommendationsLogStatus('Reteno logRecommendations is not available.');
                    return;
                }

                var recomVariantId = recomLogVariantIdEl ? String(recomLogVariantIdEl.value || '').trim() : '';
                if (!recomVariantId && recomVariantIdEl) {
                    recomVariantId = String(recomVariantIdEl.value || '').trim();
                }
                if (!recomVariantId) {
                    setRecommendationsLogStatus('Please provide recomVariantId.');
                    return;
                }

                var eventType = recomLogEventTypeEl ? String(recomLogEventTypeEl.value || '').trim() : 'IMPRESSIONS';
                if (!eventType) {
                    eventType = 'IMPRESSIONS';
                }

                var productIds = parseCsv(recomLogProductIdsEl ? recomLogProductIdsEl.value : '');
                if (!productIds.length && lastRecommendationProductIds.length) {
                    productIds = lastRecommendationProductIds.slice(0);
                }
                if (!productIds.length) {
                    setRecommendationsLogStatus('Please provide productIds.');
                    return;
                }

                var occurred = new Date().toISOString();
                var recomEvents = productIds.map(function (productId) {
                    return {
                        recomEventType: eventType,
                        occurred: occurred,
                        productId: productId,
                    };
                });

                setRecommendationsLogStatus('Logging recommendation events...');
                sdk.logRecommendations({ recomVariantId: recomVariantId, recomEvents: recomEvents })
                    .then(function () {
                        setRecommendationsLogStatus('logRecommendations: OK (' + recomEvents.length + ' events)');
                    })
                    .catch(function (err) {
                        setRecommendationsLogStatus(
                            'logRecommendations: error: ' + (err && err.message ? err.message : String(err))
                        );
                    });
            }, function (err) {
                setRecommendationsLogStatus('Reteno init error: ' + (err && err.message ? err.message : String(err)));
            });
        });
    }

    function bindEcomButton(button, eventType) {
        if (!button) return;
        button.addEventListener('click', function () {
            withInit(function () {
                var sdk = getRetenoSdk();
                if (!sdk || typeof sdk.logEcommerceEvent !== 'function') {
                    setEcomStatus('Reteno logEcommerceEvent is not available.');
                    return;
                }
                var payload = buildEcomPayload(eventType);
                setEcomStatus('Logging ecommerce event: ' + eventType + '...');
                sdk
                    .logEcommerceEvent(payload)
                    .then(function () {
                        setEcomStatus('logEcommerceEvent: OK (' + eventType + ')');
                    })
                    .catch(function (err) {
                        setEcomStatus(
                            'logEcommerceEvent: error: ' + (err && err.message ? err.message : String(err))
                        );
                    });
            }, function (err) {
                setEcomStatus('Reteno init error: ' + (err && err.message ? err.message : String(err)));
            });
        });
    }

    bindEcomButton(ecomProductViewedBtn, 'productViewed');
    bindEcomButton(ecomProductCategoryViewedBtn, 'productCategoryViewed');
    bindEcomButton(ecomProductAddedToWishlistBtn, 'productAddedToWishlist');
    bindEcomButton(ecomCartUpdatedBtn, 'cartUpdated');
    bindEcomButton(ecomOrderCreatedBtn, 'orderCreated');
    bindEcomButton(ecomOrderUpdatedBtn, 'orderUpdated');
    bindEcomButton(ecomOrderDeliveredBtn, 'orderDelivered');
    bindEcomButton(ecomOrderCancelledBtn, 'orderCancelled');
    bindEcomButton(ecomSearchRequestBtn, 'searchRequest');
}
