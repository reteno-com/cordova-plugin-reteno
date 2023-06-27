## Installation

1. Follow `Step 1` described in iOS SDK setup guide: [link](https://docs.reteno.com/reference/ios#step-1-add-the-notification-service-extension)


2. Modify your cocoapod file to contain next dependencies:
```

target 'NotificationServiceExtension' do
  pod 'Reteno', '1.6.4'
  pod 'Sentry', '8.2.0', :modular_headers => true

end

target 'RetenoSdkExample' do
  ...
  pod 'Reteno', '1.6.4'
  pod 'Sentry', '8.2.0', :modular_headers => true
end

```

