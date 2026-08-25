#import <Foundation/Foundation.h>
#import <AVFoundation/AVFoundation.h>

// =============================================================================
// PLAYER DELEGATE (Detects natural track completion)
// =============================================================================
@interface PlayerDelegate : NSObject <AVAudioPlayerDelegate>
@end

@implementation PlayerDelegate
- (void)audioPlayerDidFinishPlaying:(AVAudioPlayer *)player successfully:(BOOL)flag {
    printf("ENDED\n");
    fflush(stdout);
}
@end

static AVAudioPlayer *g_player = nil;
static PlayerDelegate *g_delegate = nil;

// =============================================================================
// COMMAND HANDLER (Reads text commands from JavaScript stdin)
// =============================================================================
void handleCommand(NSString *line) {
    NSArray *parts = [line componentsSeparatedByString:@" "];
    if (parts.count == 0) return;
    NSString *cmd = parts[0];

    if ([cmd isEqualToString:@"PLAY"]) {
        if (parts.count < 2) return;
        NSString *filePath = [[parts subarrayWithRange:NSMakeRange(1, parts.count - 1)] componentsJoinedByString:@" "];
        float rate = 1.0;
        float volume = 0.8;

        if (g_player) {
            [g_player stop];
            g_player = nil;
        }

        NSURL *url = [NSURL fileURLWithPath:filePath];
        NSError *error = nil;
        g_player = [[AVAudioPlayer alloc] initWithContentsOfURL:url error:&error];
        if (error || !g_player) {
            printf("ERROR %s\n", error.localizedDescription.UTF8String);
            fflush(stdout);
            return;
        }

        if (!g_delegate) {
            g_delegate = [[PlayerDelegate alloc] init];
        }
        g_player.delegate = g_delegate;
        g_player.enableRate = YES;
        [g_player prepareToPlay];
        g_player.rate = rate;
        g_player.volume = volume;
        [g_player play];

        printf("DURATION %d\n", (int)round(g_player.duration));
        fflush(stdout);
    } else if ([cmd isEqualToString:@"PAUSE"]) {
        if (g_player && g_player.isPlaying) {
            [g_player pause];
            printf("PAUSED\n");
            fflush(stdout);
        }
    } else if ([cmd isEqualToString:@"RESUME"]) {
        if (g_player && !g_player.isPlaying) {
            [g_player play];
            printf("RESUMED\n");
            fflush(stdout);
        }
    } else if ([cmd isEqualToString:@"RATE"]) {
        if (parts.count > 1 && g_player) {
            float r = [parts[1] floatValue];
            if (r < 0.5) r = 0.5;
            if (r > 2.0) r = 2.0;
            g_player.rate = r;
            printf("RATE_SET %.2f\n", r);
            fflush(stdout);
        }
    } else if ([cmd isEqualToString:@"VOLUME"]) {
        if (parts.count > 1 && g_player) {
            float v = [parts[1] floatValue];
            if (v < 0.0) v = 0.0;
            if (v > 1.0) v = 1.0;
            g_player.volume = v;
            printf("VOL_SET %.2f\n", v);
            fflush(stdout);
        }
    } else if ([cmd isEqualToString:@"STOP"]) {
        if (g_player) {
            [g_player stop];
            g_player = nil;
            printf("STOPPED\n");
            fflush(stdout);
        }
    } else if ([cmd isEqualToString:@"QUIT"]) {
        if (g_player) {
            [g_player stop];
            g_player = nil;
        }
        exit(0);
    }
}

// =============================================================================
// MAIN ENTRYPOINT
// =============================================================================
int main(int argc, const char * argv[]) {
    @autoreleasepool {
        dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
            char buffer[4096];
            while (fgets(buffer, sizeof(buffer), stdin) != NULL) {
                NSString *line = [[NSString stringWithUTF8String:buffer] stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
                if (line.length == 0) continue;
                dispatch_async(dispatch_get_main_queue(), ^{
                    handleCommand(line);
                });
            }
            exit(0);
        });

        [[NSRunLoop currentRunLoop] run];
    }
    return 0;
}
